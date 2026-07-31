# Realtime Event Contract (implied by the UI)

presence.{online,away,busy,offline,custom_status}
conversation.{created,updated,typing_started,typing_stopped,read_updated}
message.{created,updated,deleted,delivered,read,reaction_added,reaction_removed,pinned,unpinned}
group.{updated,member_added,member_removed,role_changed,announcement_created,event_created}
status.{created,viewed,reaction_added,deleted,expired}
file.{upload_progress,processing,ready,failed,shared,comment_added,version_added}
call.{incoming,accepted,rejected,participant_joined,participant_left,recording_started,recording_stopped,ended}
notification.{created,read,count_updated}

Rules the UI depends on:
- unread badges update per conversation AND aggregate (sidebar + mobile bottom nav)
- typing state renders in the conversation row ("Typing…" in accent color, italic)
- read ticks (double check, accent color) appear on own messages when read
- status viewer segments advance server-agnostically; view recording must be idempotent
- call tiles show speaking indicator + mic state per participant in real time
