import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

// Supported file extensions
const SUPPORTED_EXTENSIONS = new Set([
    '.js',
    '.ts',
    '.hbs',
    '.less',
    '.scss',
    '.css',
    '.gjs',
    '.gts'
]);

// Glimmer component extensions (single-file components)
const GLIMMER_EXTENSIONS = new Set(['.gjs', '.gts']);

// Style file extensions
const STYLE_EXTENSIONS = new Set(['.less', '.scss', '.css']);

// Directories to skip during search
const SKIP_DIRECTORIES = new Set([
    'node_modules',
    'dist',
    'tmp',
    '.git',
    'bower_components',
    'vendor'
]);

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand(
        'ember-hopper.search',
        async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    return;
                }

                const currentFilePath = editor.document.fileName;

                // Load user settings
                const config = vscode.workspace.getConfiguration('emberHopper');
                const useEmojis = config.get<boolean>('showEmojis', true);

                // 1. Detect Base Entity (Handles Pods vs Classic)
                let fileName = path.basename(
                    currentFilePath,
                    path.extname(currentFilePath)
                );
                const genericNames = [
                    'component',
                    'template',
                    'route',
                    'controller',
                    'model',
                    'adapter',
                    'serializer'
                ];

                if (genericNames.includes(fileName)) {
                    // It's a Pod! Grab the parent folder name instead
                    fileName = path.basename(path.dirname(currentFilePath));
                }

                // Strip suffixes to get the core name (e.g., 'login-test' -> 'login', 'payment-collection-test' -> 'payment-collection')
                let baseEntity = fileName;
                // Remove -test suffix (but only if it's at the end)
                if (baseEntity.endsWith('-test')) {
                    baseEntity = baseEntity.slice(0, -5); // Remove '-test' (5 characters)
                }
                // Also handle .test suffix
                baseEntity = baseEntity.replace(/\.test$/, '');

                // 2. Search for matches using fast directory-based search
                // Start from the directory containing the current file and search nearby
                const currentFileDir = path.dirname(currentFilePath);
                const workspaceFolders = vscode.workspace.workspaceFolders;
                const workspaceRoot =
                    workspaceFolders && workspaceFolders.length > 0
                        ? workspaceFolders[0].uri.fsPath
                        : currentFileDir;

                let files: vscode.Uri[] = [];
                await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: `Searching for files related to "${baseEntity}"...`,
                        cancellable: false
                    },
                    async () => {
                        // Search in multiple locations: current dir, parent dirs
                        const searchDirs: Array<{
                            dir: string;
                            depth: number;
                        }> = [
                            { dir: currentFileDir, depth: 6 }, // Start with current directory
                            { dir: path.dirname(currentFileDir), depth: 6 }, // Parent directory
                            {
                                dir: path.dirname(path.dirname(currentFileDir)),
                                depth: 6
                            } // Grandparent
                        ];

                        // Check all common directories in parallel for speed
                        const allDirsToCheck = [
                            // Common Ember source directories
                            'packages',
                            'lib',
                            'app',
                            'src',
                            'addon',
                            // Test directories
                            'tests',
                            'test',
                            'spec',
                            'specs'
                        ];

                        const dirCheckResults = await Promise.all(
                            allDirsToCheck.map(async (dirName) => {
                                const dirPath = path.join(
                                    workspaceRoot,
                                    dirName
                                );
                                try {
                                    const stats = await fs.stat(dirPath);
                                    if (stats.isDirectory()) {
                                        // Use depth 8 to handle deeply nested Ember monorepo structures
                                        // e.g., lib/settings/addon/routes/settings/billing/payment-setup.js
                                        return { dir: dirPath, depth: 8 };
                                    }
                                } catch {
                                    // Directory doesn't exist, skip
                                }
                                return null;
                            })
                        );

                        // Add existing directories to search list
                        for (const result of dirCheckResults) {
                            if (result) {
                                searchDirs.push(result);
                            }
                        }

                        // Remove duplicates from search dirs
                        const uniqueDirs = new Map<string, number>();
                        for (const { dir, depth } of searchDirs) {
                            if (
                                !uniqueDirs.has(dir) ||
                                uniqueDirs.get(dir)! < depth
                            ) {
                                uniqueDirs.set(dir, depth);
                            }
                        }

                        // Search directories in parallel for speed
                        const searchPromises = Array.from(
                            uniqueDirs.entries()
                        ).map(async ([searchDir, maxDepth]) => {
                            try {
                                return await findFilesInDirectory(
                                    searchDir,
                                    baseEntity,
                                    maxDepth
                                );
                            } catch (error) {
                                return [];
                            }
                        });

                        // Wait for all searches to complete
                        const searchResults = await Promise.all(searchPromises);
                        files = searchResults.flat();

                        // Remove duplicates by comparing file paths (not URI objects)
                        const uniqueFiles = new Map<string, vscode.Uri>();
                        for (const file of files) {
                            const filePath = file.fsPath;
                            if (!uniqueFiles.has(filePath)) {
                                uniqueFiles.set(filePath, file);
                            }
                        }
                        files = Array.from(uniqueFiles.values());

                        // Filter out the current file
                        files = files.filter(
                            (file) => file.fsPath !== currentFilePath
                        );
                    }
                );

                if (files.length === 0) {
                    vscode.window.showInformationMessage(
                        `No related files found for "${baseEntity}"`
                    );
                    return;
                }

                // 3. Prepare the QuickPick menu items
                const items = files.map((file) => {
                    const relPath = vscode.workspace.asRelativePath(file);
                    return {
                        label: getEmberLabel(relPath, useEmojis),
                        description: relPath,
                        uri: file
                    };
                });

                // 4. Show the menu in the Command Center
                const selection = await vscode.window.showQuickPick(items, {
                    placeHolder: `Ember Hopper: Files related to "${baseEntity}"`,
                    matchOnDescription: true
                });

                if (selection) {
                    const doc = await vscode.workspace.openTextDocument(
                        selection.uri
                    );
                    await vscode.window.showTextDocument(doc);
                }
            } catch (error) {
                throw error;
            }
        }
    );

    context.subscriptions.push(disposable);
}

function getEmberLabel(filePath: string, useEmojis: boolean): string {
    const p = filePath.toLowerCase();
    const ext = path.extname(p);
    const fileName = path.basename(p, ext);
    // Split path into segments for accurate matching
    const segments = p.split(/[/\\]/);

    let type = 'File';
    let emoji = '';

    // Check for test files first (by filename pattern and path segments)
    if (
        fileName.endsWith('-test') ||
        fileName.endsWith('.test') ||
        segments.includes('addon-test-support') ||
        segments.includes('tests') ||
        segments.includes('test') ||
        segments.includes('spec') ||
        segments.includes('specs')
    ) {
        type = 'Test';
        emoji = '🧪 ';
    } else if (STYLE_EXTENSIONS.has(ext)) {
        // Check file extension for styles (not path content)
        type = 'Styles';
        emoji = '🎨 ';
    } else if (ext === '.hbs') {
        // Check file extension for templates
        type = 'Template';
        emoji = '📝 ';
    } else if (segments.includes('controllers') || fileName === 'controller') {
        type = 'Controller';
        emoji = '🕹️ ';
    } else if (segments.includes('routes') || fileName === 'route') {
        type = 'Route';
        emoji = '🛣️ ';
    } else if (
        segments.includes('components') ||
        fileName === 'component' ||
        GLIMMER_EXTENSIONS.has(ext)
    ) {
        type = 'Component';
        emoji = '🧩 ';
    } else if (segments.includes('models') || fileName === 'model') {
        type = 'Model';
        emoji = '💾 ';
    } else if (segments.includes('serializers') || fileName === 'serializer') {
        type = 'Serializer';
        emoji = '📋 ';
    } else if (segments.includes('adapters') || fileName === 'adapter') {
        type = 'Adapter';
        emoji = '🔌 ';
    }

    return useEmojis ? `${emoji}${type}` : type;
}

// Fast directory-based search using readdir with withFileTypes (avoids extra stat calls)
async function findFilesInDirectory(
    dir: string,
    baseEntity: string,
    maxDepth: number,
    currentDepth: number = 0,
    visited: Set<string> = new Set()
): Promise<vscode.Uri[]> {
    const files: vscode.Uri[] = [];

    // Skip if we've visited this directory or exceeded max depth
    if (visited.has(dir) || currentDepth > maxDepth) {
        return files;
    }
    visited.add(dir);

    // Skip common non-source directories
    const dirName = path.basename(dir);
    if (SKIP_DIRECTORIES.has(dirName)) {
        return files;
    }

    try {
        // Use withFileTypes to avoid separate stat() calls - major performance improvement
        const entries = await fs.readdir(dir, { withFileTypes: true });

        const subdirPromises: Promise<vscode.Uri[]>[] = [];

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                // Queue subdirectory searches to run in parallel
                if (
                    currentDepth < maxDepth &&
                    !SKIP_DIRECTORIES.has(entry.name)
                ) {
                    subdirPromises.push(
                        findFilesInDirectory(
                            fullPath,
                            baseEntity,
                            maxDepth,
                            currentDepth + 1,
                            visited
                        )
                    );
                }
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name);

                // Only process supported file types
                if (!SUPPORTED_EXTENSIONS.has(ext)) {
                    continue;
                }

                const fileName = path.basename(entry.name, ext);

                // Match exact name (e.g., payment-collection.js, payment-collection.hbs)
                if (fileName === baseEntity) {
                    files.push(vscode.Uri.file(fullPath));
                }
                // Match test files (e.g., payment-collection-test.js when searching for payment-collection)
                else if (
                    (fileName === `${baseEntity}-test` ||
                        fileName === `${baseEntity}.test`) &&
                    (ext === '.js' || ext === '.ts')
                ) {
                    files.push(vscode.Uri.file(fullPath));
                }
                // Match pod structure: directory named after entity with generic file inside
                // e.g., payment-collection/component.js, payment-collection/template.hbs
                else if (
                    dirName === baseEntity &&
                    [
                        'component',
                        'template',
                        'route',
                        'controller',
                        'model',
                        'adapter',
                        'serializer',
                        'styles'
                    ].includes(fileName)
                ) {
                    files.push(vscode.Uri.file(fullPath));
                }
            }
        }

        // Process subdirectories in parallel for speed
        if (subdirPromises.length > 0) {
            const subResults = await Promise.all(subdirPromises);
            for (const subFiles of subResults) {
                files.push(...subFiles);
            }
        }
    } catch (error) {
        // Skip directories we can't read
    }

    return files;
}

export function deactivate() {}
