/* eslint-disable max-len */
import * as vscode from 'vscode';

const apply = (f: (text: string) => string) => {
    const editor = vscode.window.activeTextEditor;

    if (!editor) return;

    if (
        editor.selections.length > 1
        || (editor.selections.length
            && editor.selections[0].start.line !== editor.selections[0].end.line
            && editor.selections[0].start.character
                !== editor.selections[0].end.character)
    ) {
        editor.edit((editBuilder) => {
            editor?.selections.map((selection: vscode.Selection) => {
                const text = editor?.document.getText(selection);

                const newText = f(text);

                editBuilder.replace(selection, newText || ``);
            });
        });
    } else {
        editor.edit((editBuilder) => {
            const text = editor?.document.getText();

            const newText = f(text);

            const lastLine = editor?.document.lineCount - 1;
            const lastChar = editor?.document.lineAt(lastLine).text.length;

            editBuilder.replace(
                new vscode.Range(
                    new vscode.Position(0, 0),
                    new vscode.Position(lastLine, lastChar),
                ),

                newText || ``,
            );
        });
    }
};

const mapLines = (f: (text: string) => string) => (text: string) =>
    text.split(/\r?\n/).map(f).join(`\n`);

const filterLines = (f: (text: string) => string) => (text: string) =>
    text.split(/\r?\n/).filter(f).join(`\n`);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// ty to https://stackoverflow.com/questions/11233498/json-stringify-without-quotes-on-properties
const objToString = (obj: any): string => {
    const cleaned = JSON.stringify(obj, null, 4);

    return cleaned.replace(/^[\t ]*"[^:\n\r]+(?<!\\)":/gm, function (match) {
        return match.replace(/"/g, ``);
    });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const applyJS = (f: (text: unknown) => any) => (text: string) => {
    return objToString(f(eval(`(${text})`)));
};

const applyJSON = (f: (text: unknown) => unknown) => (text: string) =>
    JSON.stringify(f(JSON.parse(text)), null, 4);

const toJS = (fString?: string) => {
    if (!fString) return undefined;

    const f = eval(fString);

    return f;
};

export const activate = (context: vscode.ExtensionContext): void => {
    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand(`jsm.lineMap`, () => {
            vscode.window
                .showInputBox({
                    title: `map`,
                    value: `(line, index) => `,
                })
                .then((value) => {
                    apply(mapLines(toJS(value)));
                });
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand(`jsm.lineMapString`, () => {
            vscode.window
                .showInputBox({
                    title: `map string`,
                })
                .then((value) => {
                    apply(mapLines(toJS(`(line, index) => \`${value}\``)));
                });
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand(`jsm.lineFilter`, () => {
            vscode.window
                .showInputBox({
                    title: `filter`,
                    value: `(line, index) => `,
                })
                .then((value) => {
                    apply(filterLines(toJS(value)));
                });
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand(`jsm.lineFilterRegex`, () => {
            vscode.window
                .showInputBox({
                    title: `filter regex`,
                })
                .then((value) => {
                    apply(
                        filterLines(
                            toJS(`(line, index) => line.match(/${value}/)`),
                        ),
                    );
                });
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand(`jsm.lineApply`, () => {
            vscode.window
                .showInputBox({
                    title: `all`,
                    value: `(text) => `,
                })
                .then((value) => {
                    apply(toJS(value));
                });
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand(`jsm.lineGenerate`, () => {
            vscode.window
                .showInputBox({
                    title: `generate, function`,
                    value: `(index, prev) => `,
                })
                .then((f) => {
                    vscode.window
                        .showInputBox({
                            title: `generate, limit`,
                        })
                        .then((limit) => {
                            const editor = vscode.window.activeTextEditor;
                            if (!editor) return;

                            editor.edit((editBuilder) => {
                                const array = [
                                    ...Array(
                                        Number.parseInt(limit || `1`),
                                    ).keys(),
                                ];

                                for (const index of array) {
                                    array[index] = toJS(f)(
                                        index,
                                        array[index - 1],
                                    );
                                }

                                const lastLine = editor?.document.lineCount - 1;
                                const lastChar
                                    = editor?.document.lineAt(lastLine).text
                                        .length;

                                editBuilder.replace(
                                    new vscode.Range(
                                        new vscode.Position(0, 0),
                                        new vscode.Position(lastLine, lastChar),
                                    ),

                                    array.join(`\n`),
                                );
                            });
                        });
                });
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand(`jsm.jsApply`, () => {
            vscode.window
                .showInputBox({
                    title: `map`,
                    value: `(object) => ({...object})`,
                })
                .then((value) => {
                    apply(applyJS(toJS(value)));
                });
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand(`jsm.jsToJson`, () => {
            apply((text) => {
                return JSON.stringify(toJS(`(${text})`), null, 4);
            });
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand(`jsm.jsonApply`, () => {
            vscode.window
                .showInputBox({
                    title: `map`,
                    value: `(object) => ({...object})`,
                })
                .then((value) => {
                    apply(applyJSON(toJS(value)));
                });
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand(`jsm.jsonToJs`, () => {
            apply((text) => objToString(JSON.parse(text)));
        }),
    );
};

export const deactivate = (): undefined => undefined;
