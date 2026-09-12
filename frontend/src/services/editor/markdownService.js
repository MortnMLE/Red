import { ViewPlugin, Decoration } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';

export function markdownFadeInactiveLines() {
    return ViewPlugin.fromClass(
        class {
            decorations;

            constructor(view) {
                this.decorations = this.build(view);
            }

            update(update) {
                if (
                    update.docChanged ||
                    update.selectionSet ||
                    update.viewportChanged
                ) {
                    this.decorations = this.build(update.view);
                }
            }

            build(view) {
                const builder = new RangeSetBuilder();

                const doc = view.state.doc;
                const selection = view.state.selection.main;
                const activeLine = doc.lineAt(selection.head);

                const activeFrom = activeLine.from;
                const activeTo = activeLine.to;

                const tree = syntaxTree(view.state);

                for (const { from, to } of view.visibleRanges) {
                    tree.iterate({
                        from,
                        to,
                        enter: (node) => {
                            const isSyntaxToken =
                                node.name === "HeaderMark" ||
                                node.name === "EmphasisMark" ||
                                node.name === "StrongEmphasisMark" ||
                                node.name === "CodeMark" ||
                                node.name === "LinkMark" ||
                                node.name === "QuoteMark";
                                
                            if (!isSyntaxToken) return;

                            const inActiveLine =
                                node.from >= activeFrom &&
                                node.from <= activeTo;

                            if (inActiveLine) return;

                            builder.add(
                                node.from,
                                node.to,
                                Decoration.mark({
                                    class: "cm-md-faded"
                                })
                            );
                        }
                    });
                }

                return builder.finish();
            }
        },
        {
            decorations: v => v.decorations
        }
    );
}

export function removeMarkdown(str = '') {
    return str
        // headings
        .replace(/^#{1,6}\s+/gm, '')

        // bold / italic
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/__(.*?)__/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/_(.*?)_/g, '$1')

        // inline code
        .replace(/`(.*?)`/g, '$1')

        // fenced code blocks
        .replace(/```[\s\S]*?```/g, '')

        // blockquotes
        .replace(/^>\s+/gm, '')

        // unordered lists
        .replace(/^[-*+]\s+/gm, '')

        // ordered lists
        .replace(/^\d+\.\s+/gm, '')

        // images
        .replace(/!\[(.*?)\]\((.*?)\)/g, '$1')

        // links
        .replace(/\[(.*?)\]\((.*?)\)/g, '$1')

        // horizontal rules
        .replace(/^---$/gm, '')
        .replace(/^\*\*\*$/gm, '')

        // extra whitespace cleanup
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}