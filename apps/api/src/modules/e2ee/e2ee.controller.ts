import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthedUser } from "../../common/session.service";
import { ZodPipe } from "../../common/zod.pipe";
import { E2EEService } from "./e2ee.service";
import {
  ackToDeviceSchema,
  claimKeysSchema,
  queryKeysSchema,
  toDeviceSchema,
  uploadKeysSchema,
  type ClaimKeysBody,
  type QueryKeysBody,
  type ToDeviceBody,
  type UploadKeysBody,
} from "./types";

// The authenticated device ID comes from the signed JWT and is never accepted
// from an untrusted request body.
@Controller("e2ee")
export class E2EEController {
  constructor(private readonly e2ee: E2EEService) {}

  @Get("devices/current")
  current(@CurrentUser() auth: AuthedUser) { return this.e2ee.currentDevice(auth); }

  @Get("devices")
  devices(@CurrentUser() auth: AuthedUser) { return this.e2ee.listDevices(auth); }

  @Delete("devices/:id")
  revoke(@CurrentUser() auth: AuthedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.e2ee.revokeDevice(auth, id);
  }

  @Post("keys/upload")
  upload(@CurrentUser() auth: AuthedUser, @Body(new ZodPipe(uploadKeysSchema)) body: UploadKeysBody) {
    return this.e2ee.uploadKeys(auth, body);
  }

  @Post("keys/query")
  query(@CurrentUser() auth: AuthedUser, @Body(new ZodPipe(queryKeysSchema)) body: QueryKeysBody) {
    return this.e2ee.queryKeys(auth, body);
  }

  @Post("keys/claim")
  claim(@CurrentUser() auth: AuthedUser, @Body(new ZodPipe(claimKeysSchema)) body: ClaimKeysBody) {
    return this.e2ee.claimKeys(auth, body);
  }

  @Post("to-device")
  sendToDevice(@CurrentUser() auth: AuthedUser, @Body(new ZodPipe(toDeviceSchema)) body: ToDeviceBody) {
    return this.e2ee.sendToDevice(auth, body);
  }

  @Get("sync/to-device")
  sync(@CurrentUser() auth: AuthedUser, @Query("since") since?: string) { return this.e2ee.syncToDevice(auth, since); }

  @HttpCode(200)
  @Post("sync/to-device/ack")
  ack(@CurrentUser() auth: AuthedUser, @Body(new ZodPipe(ackToDeviceSchema)) body: { ids: string[] }) {
    return this.e2ee.ackToDevice(auth, body.ids);
  }
}
