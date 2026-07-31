# Design Tokens

## Color — light
--background #ffffff | --background-subtle #fbfaff | --surface #ffffff
--surface-muted #f8f7fc | --surface-hover #f7f3ff | --surface-selected #f2ebff
--text-primary #171525 | --text-secondary #616677 | --text-muted #9297a8
--border #e7e8ef | --border-strong #d6d8e2
primary: 50 #f7f2ff / 100 #eee5ff / 200 #decaff / 300 #c6a5ff / 400 #a873ff /
500 #8950f5 / 600 #7137e8 / 700 #5e28c7 / 800 #4d229f / 900 #3e1f7e
success #22b967 | warning #f3a622 | danger #ef4457 | info #3d78f3

## Color — dark
bg #131120 | surface #1b1828 | muted #201c2e | hover #241f36 | selected #2c2347
text #f0eef8 | secondary #a5a1b8 | muted-text #6f6b84 | border #282438

## Accent palettes (user-selectable)
purple(default), blue #3d78f3, teal #14b8c4, green #22b967, orange #f38922, rose #ef4470
— each swaps p500/p600/p700 + selected/hover/bubble tints (see body[data-accent] rules).

## Typography
Plus Jakarta Sans 400–800. Page title 20–22, section 16–17, card title 13.5–14,
body 13–14, meta 11–12.5, caption 10–11. Weights: 800 headings, 700 emphasis, 600 nav.

## Layout
Primary sidebar 218 | context sidebar 238–300 | detail panel 300–320 | min app width 1280.
Mobile breakpoint <760px: single panel + 44px+ touch targets + bottom nav.

## Radius
controls 9–11, cards 14–15, tiles 16, media 18–22, pills 999.

## Spacing scale
4 / 8 / 12 / 16 / 20 / 24 / 32.

## Motion
toggles 180ms, hover instant, status segment 5s linear fill. Respect reduced motion.
