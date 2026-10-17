<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/itsakbarov/itsakbarov/output/record-dark.svg">
  <img alt="Every day since 21 September 2019, drawn as one line wound into a spiral: one turn per year, thicker on days with more contributions. A green dot marks today. Redrawn every night." src="https://raw.githubusercontent.com/itsakbarov/itsakbarov/output/record-light.svg" width="100%">
</picture>

<samp>Almost everything I build is private, so the line above is its trace:<br>
every day since 2019-09-21, one turn per year, heavier on busier days.<br>
Redrawn every night from my contribution calendar.</samp>

<samp>NOW&nbsp;&nbsp;O&nbsp;Foundation&nbsp;·&nbsp;<a href="https://ofoundation.com">ofoundation.com</a><br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Neni&nbsp;·&nbsp;<a href="https://neni.uz">neni.uz</a></samp>

<details>
<summary><samp>How the line is drawn</samp></summary>
<br>
<samp>Every night a GitHub Action runs <a href="scripts/press.mjs">scripts/press.mjs</a>. It reads my contribution calendar from the GitHub GraphQL API, places each day on a spiral (12 o'clock is 1 January), sets the line's weight from that day's count, and writes a light and a dark SVG to the <code>output</code> branch. No dependencies, no tracking, nothing drawn by hand.</samp>
</details>
