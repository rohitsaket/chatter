import { ChatsModule } from "@/components/chats/ChatsModule";

export default async function ChatThreadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ChatsModule slug={slug} />;
}
