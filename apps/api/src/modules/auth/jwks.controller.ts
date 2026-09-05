import { Controller, Get, Header } from "@nestjs/common";
import { Public } from "../../common/session.guard";
import { JwtTokenService } from "../../common/jwt-token.service";

@Controller(".well-known")
export class JwksController {
  constructor(private readonly jwt: JwtTokenService) {}

  @Public()
  @Get("jwks.json")
  @Header("Cache-Control", "public, max-age=300, stale-while-revalidate=300")
  getJwks() {
    return this.jwt.jwks();
  }
}
