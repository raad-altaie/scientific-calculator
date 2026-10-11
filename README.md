# Scientific Calculator

<p > Scientific Calculator "Browser Extension"</p>

<div style="text-align:center"> <img src ="https://github.com/raad-altaie/Scientific-Calculator/blob/master/screenshot.png"  alt="Scientific Calculator" style="height: 700px;" /> </div>


# <p align="left"> <b>[check it out](https://goo.gl/dvrvUY) </b></p>


# License

MIT License

Copyright (c) Raad Altaie

## Website version

`web/` is a standalone copy of the calculator for the web: the calculator on the left, the options on the right. On a screen narrower than 1100px (phones and iPads) the options stay hidden until you click the `?` on the calculator. Host the folder as-is on any static host, or run `python3 -m http.server` inside it. It does not need the extension.

After changing the calculator in the extension, run `scripts/sync-web.sh` to copy it into `web/`. What the web changes (base font size, shadow) is kept in `web/css/calc-overrides.css`, so the copy never needs hand edits.
