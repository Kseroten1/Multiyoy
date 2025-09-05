import path from "path";
import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";
import { viteSingleFile } from "vite-plugin-singlefile";
import { compression } from "vite-plugin-compression2";
import { createHtmlPlugin } from "vite-plugin-html";

function randomLetter() {
    const letters = "abcdefghijklmnopqrstuvwxyz";
    return letters[Math.floor(Math.random() * letters.length)];
}

function modifySingleHtmlPlugin() {
    let outDir;
    const idMap = new Map();
    const classMap = new Map();

    function getReplacement(map, original) {
        if (!map.has(original)) {
            let replacement;
            do {
                replacement = randomLetter();
            } while ([...map.values()].includes(replacement));
            map.set(original, replacement);
        }
        return map.get(original);
    }

    return {
        name: "modify-single-html",
        configResolved(c) {
            outDir = c.build.outDir || "dist";
        },
        async closeBundle() {
            const filePath = path.join(outDir, "index.html");
            let content = await Bun.file(filePath).text();

            // Replace IDs in HTML
            content = content.replace(/\bid\s*=\s*["']([^"']+)["']/g, (match, p1) => {
                const newId = getReplacement(idMap, p1);
                return `id="${newId}"`;
            });

            // Replace classes in HTML
            content = content.replace(
                /\bclass\s*=\s*["']([^"']+)["']/g,
                (match, p1) => {
                    const newClasses = p1
                        .split(/\s+/)
                        .map((cls) => getReplacement(classMap, cls))
                        .join(" ");
                    return `class="${newClasses}"`;
                }
            );

            // Replace getElementById in inline JS
            content = content.replace(
                /getElementById\s*\(\s*["']([^"']+)["']\s*\)/g,
                (match, p1) => {
                    const newId = getReplacement(idMap, p1);
                    return `getElementById("${newId}")`;
                }
            );

            // Replace selectors in <style> tags
            content = content.replace(/<style[^>]*>([\s\S]*?)<\/style>/g, (match, css) => {
                let newCss = css;

                // Replace #id selectors
                newCss = newCss.replace(/#([a-zA-Z0-9\-_]+)/g, (m, p1) => {
                    if (idMap.has(p1)) {
                        return `#${idMap.get(p1)}`;
                    }
                    return m;
                });

                // Replace .class selectors
                newCss = newCss.replace(/\.([a-zA-Z0-9\-_]+)/g, (m, p1) => {
                    if (classMap.has(p1)) {
                        return `.${classMap.get(p1)}`;
                    }
                    return m;
                });

                return `<style>${newCss}</style>`;
            });

            await Bun.write(filePath, content);
            console.log(`✅ Modified single HTML file (HTML, JS, CSS): ${filePath}`);
        },
    };
}

export default defineConfig({
    plugins: [
        glsl({ minify: true }), // still in use for shader imports, but no renaming
        viteSingleFile({ removeViteModuleLoader: true }),
        compression(),
        createHtmlPlugin({
            minify: true,
        }),
        modifySingleHtmlPlugin(),
    ],
});