import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { fileCommentBody } from "@chatter/contracts";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthedUser } from "../../common/session.service";
import { ZodPipe } from "../../common/zod.pipe";
import { FilesService } from "./files.service";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

@Controller("files")
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Get()
  list(@CurrentUser() user: AuthedUser, @Query("q") q?: string) {
    return this.files.list(user, q);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.files.get(user, id);
  }

  /** Raw binary upload: PUT-style POST with x-file-name / content-type headers. */
  @Post("upload")
  async upload(@CurrentUser() user: AuthedUser, @Req() req: Request) {
    const encrypted = req.headers["x-chatter-encrypted"] === "1";
    const name = encrypted ? "Encrypted attachment" : decodeURIComponent(String(req.headers["x-file-name"] ?? ""));
    if (!name) throw new BadRequestException("x-file-name header required");
    const mime = encrypted ? "application/octet-stream" : (req.headers["content-type"] ?? "application/octet-stream");
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of req) {
      total += (chunk as Buffer).length;
      if (total > MAX_UPLOAD_BYTES) throw new BadRequestException("File exceeds 50 MB limit");
      chunks.push(chunk as Buffer);
    }
    if (total === 0) throw new BadRequestException("Empty upload");
    return this.files.upload(user, name, String(mime), Buffer.concat(chunks), encrypted);
  }

  @Get(":id/download")
  async download(
    @CurrentUser() user: AuthedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { name, mime, body } = await this.files.download(user, id);
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(name)}"`);
    res.send(body);
  }

  @HttpCode(200)
  @Post(":id/star")
  star(@CurrentUser() user: AuthedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.files.toggleStar(user, id);
  }

  @Post(":id/comments")
  comment(
    @CurrentUser() user: AuthedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(fileCommentBody)) body: { body: string },
  ) {
    return this.files.comment(user, id, body.body);
  }

  @Delete(":id")
  trash(@CurrentUser() user: AuthedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.files.trash(user, id);
  }
}
