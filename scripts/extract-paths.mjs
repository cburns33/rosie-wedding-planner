import { readFileSync, writeFileSync } from "fs";
import * as fontkit from "fontkit";

const font = fontkit.create(readFileSync("/tmp/GreatVibes.ttf"));

const text = "Rosie";
const fontSize = 200;
const upem = font.unitsPerEm;
const scale = fontSize / upem;

// Use fontkit's layout engine for accurate glyph positioning
const run = font.layout(text);

let offsetX = 0;
const allCommands = [];

for (let i = 0; i < run.glyphs.length; i++) {
  const glyph = run.glyphs[i];
  const pos = run.positions[i];
  const x = offsetX + pos.xOffset * scale;
  const y = 160 + pos.yOffset * scale; // baseline at y=160

  // Scale and translate each path command
  for (const cmd of glyph.path.commands) {
    if (cmd.command === "moveTo") {
      allCommands.push({ command: "M", args: [cmd.args[0] * scale + x, -cmd.args[1] * scale + y] });
    } else if (cmd.command === "lineTo") {
      allCommands.push({ command: "L", args: [cmd.args[0] * scale + x, -cmd.args[1] * scale + y] });
    } else if (cmd.command === "quadraticCurveTo") {
      allCommands.push({
        command: "Q",
        args: [
          cmd.args[0] * scale + x, -cmd.args[1] * scale + y,
          cmd.args[2] * scale + x, -cmd.args[3] * scale + y,
        ],
      });
    } else if (cmd.command === "bezierCurveTo") {
      allCommands.push({
        command: "C",
        args: [
          cmd.args[0] * scale + x, -cmd.args[1] * scale + y,
          cmd.args[2] * scale + x, -cmd.args[3] * scale + y,
          cmd.args[4] * scale + x, -cmd.args[5] * scale + y,
        ],
      });
    } else if (cmd.command === "closePath") {
      allCommands.push({ command: "Z", args: [] });
    }
  }

  offsetX += pos.xAdvance * scale;
}

// Serialize to SVG path d string
const d = allCommands.map(({ command, args }) =>
  command + args.map(n => n.toFixed(2)).join(" ")
).join("");

// Compute bounding box
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
for (const { command, args } of allCommands) {
  if (command === "Z") continue;
  for (let i = 0; i < args.length; i += 2) {
    minX = Math.min(minX, args[i]);
    maxX = Math.max(maxX, args[i]);
    minY = Math.min(minY, args[i + 1]);
    maxY = Math.max(maxY, args[i + 1]);
  }
}

const pad = 12;
const vb = `${(minX - pad).toFixed(1)} ${(minY - pad).toFixed(1)} ${(maxX - minX + pad * 2).toFixed(1)} ${(maxY - minY + pad * 2).toFixed(1)}`;

// HTML preview with stroke-dashoffset animation
const preview = `<!DOCTYPE html>
<html>
<head>
<style>
  body { background: #faf8f5; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
  svg { width: 60vw; }
  path {
    fill: none;
    stroke: #c9a0a0;
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 5000;
    stroke-dashoffset: 5000;
    animation: draw 3s ease forwards 0.5s;
  }
  @keyframes draw { to { stroke-dashoffset: 0; } }
</style>
</head>
<body>
<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">
  <path d="${d}"/>
</svg>
</body>
</html>`;

writeFileSync("/tmp/rosie-preview.html", preview);
console.log("Preview → open /tmp/rosie-preview.html in your browser");
console.log("viewBox:", vb);
console.log("d length:", d.length, "chars");
console.log("\nviewBox string to copy:\n", vb);
