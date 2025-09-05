import path from "path";
import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";
import { viteSingleFile } from "vite-plugin-singlefile";
import { compression } from "vite-plugin-compression2";
import { createHtmlPlugin } from "vite-plugin-html";
import { minify } from "shader-minifier-wasm";

function parseMinifiedShader(minifiedJs) {
    const renameMap = new Map();

    // Capture rename mappings like: var var_FRAGCOLOR = "m"
    const renameRegex = /var\s+var_([A-Z0-9_]+)\s*=\s*"([^"]+)"/g;
    let match;
    while ((match = renameRegex.exec(minifiedJs)) !== null) {
        const original = match[1].toLowerCase();
        const renamed = match[2];
        renameMap.set(original, renamed);
    }

    // Capture the shader source (first backtick string)
    const shaderRegex = /`([^`]*)`/;
    const shaderMatch = shaderRegex.exec(minifiedJs);
    const shaderSource = shaderMatch ? shaderMatch[1] : null;

    return { shaderSource, renameMap };
}

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

            // === HTML ID + class renaming ===
            content = content.replace(/\bid\s*=\s*["']([^"']+)["']/g, (match, p1) => {
                const newId = getReplacement(idMap, p1);
                return `id="${newId}"`;
            });

            content = content.replace(/\bclass\s*=\s*["']([^"']+)["']/g, (match, p1) => {
                const newClasses = p1
                    .split(/\s+/)
                    .map((cls) => getReplacement(classMap, cls))
                    .join(" ");
                return `class="${newClasses}"`;
            });

            // === JS getElementById replacement ===
            content = content.replace(
                /getElementById\s*\(\s*["']([^"']+)["']\s*\)/g,
                (match, p1) => {
                    const newId = getReplacement(idMap, p1);
                    return `getElementById("${newId}")`;
                }
            );

            // === CSS selectors replacement ===
            content = content.replace(
                /<style[^>]*>([\s\S]*?)<\/style>/g,
                (match, css) => {
                    let newCss = css;

                    newCss = newCss.replace(/#([a-zA-Z0-9\-_]+)/g, (m, p1) => {
                        if (idMap.has(p1)) {
                            return `#${idMap.get(p1)}`;
                        }
                        return m;
                    });

                    newCss = newCss.replace(/\.([a-zA-Z0-9\-_]+)/g, (m, p1) => {
                        if (classMap.has(p1)) {
                            return `.${classMap.get(p1)}`;
                        }
                        return m;
                    });

                    return `<style>${newCss}</style>`;
                }
            );

            // === GLSL shader minification inside <script> ===
            content = await replaceInlineShaders(content);

            await Bun.write(filePath, content);
            console.log(`✅ Modified single HTML file (HTML, JS, CSS, GLSL): ${filePath}`);
        },
    };
}

// Async-safe replace for <script> blocks
async function replaceInlineShaders(html) {
    const scriptRegex = /(<script[^>]*>)([\s\S]*?)(<\/script>)/g;
    let match;
    let result = "";
    let lastIndex = 0;

    while ((match = scriptRegex.exec(html)) !== null) {
        const [fullMatch, openTag, jsCode, closeTag] = match;

        // Append everything before this <script>
        result += html.slice(lastIndex, match.index);

        // Process this <script>
        const newJs = await processJsForShaders(jsCode);

        // Preserve original <script ...> attributes
        result += openTag + newJs + closeTag;
        lastIndex = match.index + fullMatch.length;
    }

    // Append the rest of the HTML
    result += html.slice(lastIndex);

    return result;
}

async function processJsForShaders(jsCode) {
    let newJs = jsCode;

    // Find template literals that look like GLSL
    const glslRegex = /`([^`]*?(?:gl_Position|precision)[^`]*)`/g;
    let shaderMatch;
    while ((shaderMatch = glslRegex.exec(jsCode)) !== null) {
        const originalShader = shaderMatch[1];

        // Run shader-minifier
        const minified = await minify(
            { shader: originalShader },
            { format: "js" }
        );

        const { shaderSource, renameMap } = parseMinifiedShader(minified);

        if (shaderSource) {
            console.log("🔹 Minified inline shader:", shaderSource);
            console.log("🔹 Rename map:", Object.fromEntries(renameMap));

            // Replace original shader in JS code
            newJs = newJs.replace(
                "`" + originalShader + "`",
                "`" + shaderSource + "`"
            );

            // === Adjust getUniformLocation calls ===
            newJs = newJs.replace(
                /getUniformLocation\s*\(\s*[^,]+,\s*["']([^"']+)["']\s*\)/g,
                (m, uniformName) => {
                    const key = uniformName.toLowerCase();
                    if (renameMap.has(key)) {
                        return m.replace(
                            `"${uniformName}"`,
                            `"${renameMap.get(key)}"`
                        );
                    }
                    return m;
                }
            );

            // === Adjust getAttribLocation calls ===
            newJs = newJs.replace(
                /getAttribLocation\s*\(\s*[^,]+,\s*["']([^"']+)["']\s*\)/g,
                (m, attribName) => {
                    const key = attribName.toLowerCase();
                    if (renameMap.has(key)) {
                        return m.replace(
                            `"${attribName}"`,
                            `"${renameMap.get(key)}"`
                        );
                    }
                    return m;
                }
            );
        }
    }

    return newJs;
}

export default defineConfig({
    plugins: [
        glsl({ minify: true }),
        viteSingleFile({ removeViteModuleLoader: true }),
        compression(),
        createHtmlPlugin({
            minify: true,
        }),
        modifySingleHtmlPlugin(),
    ],
});