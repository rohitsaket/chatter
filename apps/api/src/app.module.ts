import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { PrismaService } from "./common/prisma.service";
import { SessionService } from "./common/session.service";
import { SessionGuard } from "./common/session.guard";
import { JwtTokenService } from "./common/jwt-token.service";
import { CsrfMiddleware } from "./common/csrf.middleware";
import { OutboxService } from "./common/outbox.service";
import { AuthController } from "./modules/auth/auth.controller";
import { AuthService } from "./modules/auth/auth.service";
import { PasswordResetService } from "./modules/auth/password-reset.service";
import { JwksController } from "./modules/auth/jwks.controller";
import { MailerService } from "./common/mailer.service";
import { UsersController } from "./modules/users/users.controller";
import { UsersService } from "./modules/users/users.service";
import { ConversationsController } from "./modules/conversations/conversations.controller";
import { ConversationsService } from "./modules/conversations/conversations.service";
import { MessagesController } from "./modules/messages/messages.controller";
import { MessagesService } from "./modules/messages/messages.service";
import { GroupsController } from "./modules/groups/groups.controller";
import { GroupsService } from "./modules/groups/groups.service";
import { StatusesController } from "./modules/statuses/statuses.controller";
import { StatusesService } from "./modules/statuses/statuses.service";
import { FilesController } from "./modules/files/files.controller";
import { FilesService } from "./modules/files/files.service";
import { CallsController } from "./modules/calls/calls.controller";
import { CallsService } from "./modules/calls/calls.service";
import { NotificationsController } from "./modules/notifications/notifications.controller";
import { NotificationsService } from "./modules/notifications/notifications.service";
import { SettingsController } from "./modules/settings/settings.controller";
import { SettingsService } from "./modules/settings/settings.service";
import { AdminController } from "./modules/admin/admin.controller";
import { AdminService } from "./modules/admin/admin.service";
import { HealthController } from "./modules/health/health.controller";
import { RealtimeGateway } from "./realtime/realtime.gateway";
import { PresenceService } from "./realtime/presence.service";
import { MessageReceiptService } from "./modules/messages/message-receipt.service";
import { E2EEController } from "./modules/e2ee/e2ee.controller";
import { E2EEService } from "./modules/e2ee/e2ee.service";

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }])],
  controllers: [
    AuthController,
    JwksController,
    UsersController,
    ConversationsController,
    MessagesController,
    GroupsController,
    StatusesController,
    FilesController,
    CallsController,
    NotificationsController,
    SettingsController,
    AdminController,
    HealthController,
    E2EEController,
  ],
  providers: [
    PrismaService,
    SessionService,
    JwtTokenService,
    OutboxService,
    AuthService,
    PasswordResetService,
    MailerService,
    UsersService,
    ConversationsService,
    MessagesService,
    GroupsService,
    StatusesService,
    FilesService,
    CallsService,
    NotificationsService,
    SettingsService,
    AdminService,
    RealtimeGateway,
    PresenceService,
    MessageReceiptService,
    E2EEService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CsrfMiddleware).forRoutes("*");
  }
}
