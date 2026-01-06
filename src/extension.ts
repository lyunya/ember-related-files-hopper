import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

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
                        // Search in multiple locations: current dir, parent dirs, and common Ember directories
                        const searchDirs = [
                            currentFileDir, // Start with current directory
                            path.dirname(currentFileDir), // Parent directory
                            path.dirname(path.dirname(currentFileDir)) // Grandparent
                        ];

                        // Add common Ember project directories from workspace root
                        const commonEmberDirs = [
                            'packages',
                            'lib',
                            'app',
                            'src',
                            'addon'
                        ];
                        for (const dirName of commonEmberDirs) {
                            const dirPath = path.join(workspaceRoot, dirName);
                            try {
                                const stats = await stat(dirPath);
                                if (stats.isDirectory()) {
                                    searchDirs.push(dirPath);
                                }
                            } catch {
                                // Directory doesn't exist, skip
                            }
                        }

                        // Also search from workspace root with deeper depth
                        searchDirs.push(workspaceRoot);

                        // Remove duplicates from search dirs
                        const uniqueDirs = Array.from(new Set(searchDirs));

                        for (const searchDir of uniqueDirs) {
                            if (files.length >= 50) {
                                break; // Limit total results
                            }

                            try {
                                // Use deeper search for workspace root and common directories
                                const isWorkspaceRoot =
                                    searchDir === workspaceRoot;
                                const isCommonDir = commonEmberDirs.some(
                                    (dir) =>
                                        searchDir.includes(
                                            path.join(workspaceRoot, dir)
                                        )
                                );
                                const maxDepth =
                                    isWorkspaceRoot || isCommonDir ? 5 : 3;

                                const dirFiles = await findFilesInDirectory(
                                    searchDir,
                                    baseEntity,
                                    maxDepth
                                );
                                files.push(...dirFiles);
                            } catch (error) {
                                // Skip directories we can't search
                            }
                        }

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

                        // Limit to 50 results
                        if (files.length > 50) {
                            files = files.slice(0, 50);
                        }
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
    let type = 'File';
    let emoji = '';

    // Check for test directories first
    if (p.includes('addon-test-support/') || p.includes('packages/tests/')) {
        type = 'Test';
        emoji = '🧪 ';
    } else if (p.includes('.less')) {
        type = 'Styles';
        emoji = '🎨 ';
    } else if (p.includes('hbs')) {
        type = 'Template';
        emoji = '📝 ';
    } else if (p.includes('controller')) {
        type = 'Controller';
        emoji = '🕹️ ';
    } else if (p.includes('route')) {
        type = 'Route';
        emoji = '🛣️ ';
    } else if (p.includes('component')) {
        type = 'Component';
        emoji = '🧩 ';
    } else if (p.includes('model')) {
        type = 'Model';
        emoji = '💾 ';
    } else if (p.includes('serializer')) {
        type = 'Serializer';
        emoji = '📋 ';
    } else if (p.includes('adapter')) {
        type = 'Adapter';
        emoji = '🔌 ';
    } else if (p.includes('test') || p.includes('spec')) {
        type = 'Test';
        emoji = '🧪 ';
    }

    return useEmojis ? `${emoji}${type}` : type;
}

// Fast directory-based search instead of slow workspace.findFiles
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

    // Skip node_modules, dist, tmp, .git
    const dirName = path.basename(dir);
    if (
        dirName === 'node_modules' ||
        dirName === 'dist' ||
        dirName === 'tmp' ||
        dirName === '.git'
    ) {
        return files;
    }

    try {
        const entries = await readdir(dir);

        for (const entry of entries) {
            if (files.length >= 50) {
                break; // Limit total results
            }

            const fullPath = path.join(dir, entry);
            let stats: fs.Stats;

            try {
                stats = await stat(fullPath);
            } catch {
                continue; // Skip if we can't stat
            }

            if (stats.isDirectory()) {
                // Recursively search subdirectories
                if (currentDepth < maxDepth) {
                    const subFiles = await findFilesInDirectory(
                        fullPath,
                        baseEntity,
                        maxDepth,
                        currentDepth + 1,
                        visited
                    );
                    files.push(...subFiles);
                }
            } else if (stats.isFile()) {
                // Check if file matches our patterns
                const fileName = path.basename(entry, path.extname(entry));
                const ext = path.extname(entry);

                // Match exact name or pod structure
                if (
                    fileName === baseEntity &&
                    (ext === '.js' ||
                        ext === '.ts' ||
                        ext === '.hbs' ||
                        ext === '.less')
                ) {
                    files.push(vscode.Uri.file(fullPath));
                } else if (
                    entry === baseEntity &&
                    (ext === '.js' ||
                        ext === '.ts' ||
                        ext === '.hbs' ||
                        ext === '.less')
                ) {
                    files.push(vscode.Uri.file(fullPath));
                }
            }
        }
    } catch (error) {
        // Skip directories we can't read
    }

    return files;
}

export function deactivate() {}
