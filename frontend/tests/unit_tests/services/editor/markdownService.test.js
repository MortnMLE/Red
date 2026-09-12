import { markdown } from '@codemirror/lang-markdown';
import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, expect, it } from 'vitest';
import {
    markdownFadeInactiveLines,
    removeMarkdown
} from '@/services/editor/markdownService';

describe('markdownService', () => {
    describe('removeMarkdown', () => {
        it('removes the expected markdown formatting while preserving visible text', () => {
            const input = [
                '# Heading',
                '',
                '**bold** and __strong__',
                'text with `code`',
                '> blockquote',
                '- first item',
                '1. second item',
                '[docs](https://example.com)',
                '![logo](logo.png)',
                '---'
            ].join('\n');

            const result = removeMarkdown(input);

            expect(result).toBe([
                'Heading',
                '',
                'bold and strong',
                'text with code',
                'blockquote',
                'first item',
                'second item',
                'docs',
                'logo'
            ].join('\n'));
        });
    });

    describe('markdownFadeInactiveLines', () => {
        it('creates a view plugin with decorations metadata', () => {
            const extension = markdownFadeInactiveLines();
            const state = EditorState.create({
                doc: '# Heading\n**bold**\n> quote',
                selection: EditorSelection.cursor(0),
                extensions: [markdown(), extension]
            });
            const view = new EditorView({ state, parent: document.body });

            const plugin = view.plugin(extension);

            expect(plugin).toBeTruthy();
            expect(plugin.decorations).toBeTruthy();

            view.destroy();
        });
    });
});
