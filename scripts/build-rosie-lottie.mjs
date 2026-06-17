/**
 * Builds public/animations/rosie_anim.lottie from Creator MCP export payload.
 * Run after customizing file 73c38b3d-81b2-475e-a0c4-a2ce66a15549 in Lottie Creator.
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const payloadPath = join(__dirname, "rosie-creator-export.json");
const outPath = join(root, "public", "animations", "rosie_anim.lottie");

const payload = JSON.parse(readFileSync(payloadPath, "utf8"));

function rgb01({ r, g, b }) {
  return [r / 255, g / 255, b / 255, 1];
}

function shapeItem(path, index) {
  return {
    ty: "sh",
    ix: index + 1,
    ks: {
      a: 0,
      k: {
        i: path.i,
        o: path.o,
        v: path.v,
        c: path.c,
      },
    },
    nm: `Path ${index + 1}`,
    mn: "ADBE Vector Shape - Group",
    hd: false,
  };
}

function buildAnimation() {
  const { fr, w, h, op, ip, layerPos, stroke, strokeWidth, trimEnd, paths } =
    payload;

  const pathShapes = paths.map((p, i) => shapeItem(p, i));
  const trimKeyframes = trimEnd.map(({ frame, value }) => ({
    t: frame,
    s: [value],
  }));

  const group = {
    ty: "gr",
    it: [
      ...pathShapes,
      {
        ty: "tm",
        s: { a: 0, k: 0, ix: 1 },
        e: { a: 1, k: trimKeyframes, ix: 2 },
        o: { a: 0, k: 0, ix: 3 },
        m: 1,
        ix: pathShapes.length + 1,
        nm: "Trim Paths 1",
        mn: "ADBE Vector Filter - Trim",
        hd: false,
      },
      {
        ty: "st",
        c: { a: 0, k: rgb01(stroke), ix: 3 },
        o: { a: 0, k: 100, ix: 4 },
        w: { a: 0, k: strokeWidth, ix: 5 },
        lc: 2,
        lj: 2,
        ml: 4,
        bm: 0,
        ix: pathShapes.length + 2,
        nm: "Stroke 1",
        mn: "ADBE Vector Graphic - Stroke",
        hd: false,
      },
      {
        ty: "tr",
        p: { a: 0, k: [0, 0], ix: 2 },
        a: { a: 0, k: [0, 0], ix: 1 },
        s: { a: 0, k: [100, 100], ix: 3 },
        r: { a: 0, k: 0, ix: 6 },
        o: { a: 0, k: 100, ix: 7 },
        sk: { a: 0, k: 0, ix: 4 },
        sa: { a: 0, k: 0, ix: 5 },
        nm: "Transform",
      },
    ],
    nm: "Rosie Group",
    np: pathShapes.length + 1,
    cix: 2,
    bm: 0,
    ix: 1,
    mn: "ADBE Vector Group",
    hd: false,
  };

  return {
    v: "5.7.4",
    fr,
    ip,
    op,
    w,
    h,
    nm: "Rosie Intro",
    ddd: 0,
    assets: [],
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: "Rosie Outlines",
        sr: 1,
        ks: {
          o: { a: 0, k: 100, ix: 11 },
          r: { a: 0, k: 0, ix: 10 },
          p: { a: 0, k: [layerPos.x, layerPos.y, 0], ix: 2 },
          a: { a: 0, k: [0, 0, 0], ix: 1 },
          s: { a: 0, k: [100, 100, 100], ix: 6 },
        },
        ao: 0,
        shapes: [group],
        ip,
        op,
        st: ip,
        bm: 0,
      },
    ],
    markers: [],
  };
}

/** Minimal dotLottie zip (store, no compression) for broad player compatibility. */
function writeDotLottie(animationJson, outFile) {
  const animId = randomUUID();
  const animName = `animations/${animId}.json`;
  const manifest = JSON.stringify({
    version: "1.0",
    generator: "build-rosie-lottie.mjs",
    author: "Rosie Wedding Planner",
    animations: [{ id: animId, mode: "normal", direction: 1 }],
  });
  const animBody = JSON.stringify(animationJson);

  const files = [
    { name: "manifest.json", data: Buffer.from(manifest, "utf8") },
    { name: animName, data: Buffer.from(animBody, "utf8") },
  ];

  const parts = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, "utf8");
    const data = file.data;
    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc32(data), 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuf.copy(local, 30);

    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc32(data), 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    nameBuf.copy(central, 46);

    parts.push({ local, data, central });
    offset += local.length + data.length;
  }

  const centralSize = parts.reduce((n, p) => n + p.central.length, 0);
  const centralOffset = offset;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralOffset, 16);
  end.writeUInt16LE(0, 20);

  const zip = Buffer.concat([
    ...parts.flatMap((p) => [p.local, p.data]),
    ...parts.map((p) => p.central),
    end,
  ]);

  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, zip);
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return ~c >>> 0;
}

const animation = buildAnimation();
writeDotLottie(animation, outPath);
console.log(`Wrote ${outPath}`);
console.log(
  `Segment hint: [25, 300] (${payload.paths.length} glyph paths, draw-only)`,
);
