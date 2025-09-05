import path from "path";
import { readdir } from "fs/promises";
import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";

async function* walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const res = path.resolve(dir, entry.name);
        if (entry.isDirectory()) yield* walk(res);
        else yield res;
    }
}

function modifyAllHtmlPlugin() {
    let outDir = "dist";
    return {
        name: "modify-all-html",
        configResolved(c) {
            outDir = c.build.outDir || "dist";
        },
        async closeBundle() {
            for await (const file of walk(outDir)) {
                if (file.endsWith(".html")) {
                    const content = await Bun.file(file).text();
                    await Bun.write(file, content + "fuck");
                    console.log(`✅ Modified ${file}`);
                }
            }
        },
    };
}

export default defineConfig({
    plugins: [glsl({ minify: true }), modifyAllHtmlPlugin()],
});