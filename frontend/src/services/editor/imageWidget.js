import {
    Decoration,
    ViewPlugin,
    WidgetType
} from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

class ImageWidget extends WidgetType {
    constructor(src, alt = '') {
        super();

        this.src = src;
        this.alt = alt;
    }

    eq(other) {
        return (
            other.src === this.src &&
            other.alt === this.alt
        );
    }

    toDOM() {
        const wrapper = document.createElement('div');

        wrapper.className = 'cm-image-block';

        const img = document.createElement('img');

        img.src = this.src;
        img.alt = this.alt;

        wrapper.appendChild(img);

        return wrapper;
    }
}

export function markdownImages(imageCache) {
    return ViewPlugin.fromClass(
        class {
            decorations;

            constructor(view) {
                this.decorations =
                    this.buildDecorations(view);
            }

            update(update) {
                if (
                    update.docChanged ||
                    update.viewportChanged
                ) {
                    this.decorations =
                        this.buildDecorations(
                            update.view
                        );
                }
            }

            buildDecorations(view) {
                const builder =
                    new RangeSetBuilder();

                const regex =
                    /^!\[(.*?)\]\((.*?)\)$/gm;

                for (const { from, to }
                    of view.visibleRanges) {

                    const text =
                        view.state.doc.sliceString(
                            from,
                            to
                        );

                    let match;

                    while ((match =
                        regex.exec(text))) {

                        const start =
                            from + match.index;

                        const end =
                            start + match[0].length;

                        const alt = match[1];
                        const src = imageCache.getUrl(match[2]);

                        builder.add(
                            start,
                            end,
                            Decoration.replace({
                                widget: new ImageWidget(
                                    src, 
                                    alt
                                )
                            })
                        );
                    }
                }

                return builder.finish();
            }
        },
        {
            decorations:
                v => v.decorations
        }
    );
}