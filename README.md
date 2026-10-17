<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/itsakbarov/itsakbarov/output/record-dark.svg">
  <img alt="Every day since 21 September 2019, drawn as one line wound into a spiral: one turn per year, thicker on days with more contributions. A green dot marks today. Redrawn every night." src="https://raw.githubusercontent.com/itsakbarov/itsakbarov/output/record-light.svg" width="100%">
</picture>

<samp>Almost everything I build is private, so the line above is its trace:<br>
every day since 2019-09-21, one turn per year, heavier on busier days.<br>
Redrawn every night from my contribution calendar.</samp>

<samp>NOW</samp>

<samp>01&nbsp;&nbsp;<a href="https://github.com/oxyz-official">O Foundation</a><br>
&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://github.com/oxyz-official">@oxyz-official</a> · <a href="https://ofoundation.com">ofoundation.com ↗</a></samp>

<samp>02&nbsp;&nbsp;<a href="https://github.com/Neni-app">Neni</a><br>
&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://github.com/Neni-app">@Neni-app</a> · <a href="https://neni.uz">neni.uz ↗</a></samp>

<samp>03&nbsp;&nbsp;<a href="https://github.com/blackbit-official">BlackBit</a><br>
&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://github.com/blackbit-official">@blackbit-official ↗</a></samp>

<samp><a href="https://www.linkedin.com/in/sardor-akbarov/">LinkedIn ↗</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="https://twitter.com/itsakbarov">X ↗</a></samp>

<details>
<summary><samp>How the line is drawn</samp></summary>
<br>
<samp>Every night a GitHub Action runs <a href="scripts/press.mjs">scripts/press.mjs</a>. It reads my contribution calendar from the GitHub GraphQL API, places each day on a spiral (12 o'clock is 1 January), sets the line's weight from that day's count, and writes light and dark SVGs to the <code>output</code> branch. The outer ticks mark months in the current year. No dependencies, no tracking, nothing drawn by hand.</samp>
</details>

<details>
<summary><samp>Year-by-year archive</samp></summary>
<br>
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/itsakbarov/itsakbarov/output/archive-dark.svg">
  <img alt="Year-by-year contribution totals and active days, redrawn nightly from the same calendar as the spiral. The image shows the latest included date." src="https://raw.githubusercontent.com/itsakbarov/itsakbarov/output/archive-light.svg" width="640">
</picture>

<samp>An asterisk marks a partial year. Active days have at least one contribution.<br>
Public and restricted counts use the same calendar as the spiral.</samp>
</details>
