import { WikiPluginSettings } from './PluginSettings'
import * as cheerio from 'cheerio'
import TurndownService from 'turndown'
import { App, MarkdownView, Notice, requestUrl } from 'obsidian'

class WikipediaNote {
	private settings: WikiPluginSettings
	private app: App

	constructor(settings: WikiPluginSettings, app: App) {
		this.settings = settings
		this.app = app
	}

	async create(article: string) {
		const body = await fetchWikipediaMarkdown(article, this.settings)

		/* Added by aeelre0 */
		if (this.settings.insertIntoActiveNote) {
			const inserted = insertIntoActiveNote(this.app, body)
			if (inserted) return
			// No open/active markdown note: fall back to the old behavior
			// of creating a brand new note.
		}
		/* ---------------- */

		const title = article.replace(/[^\p{L}\p{N}]/gu, '_')

		const content = `---
tags:
- wikipedia-note
---

${body}
`

		await createAndOpenNote(this.app, title, content)
	}
}

/* Added by aeelre0 */
function insertIntoActiveNote(app: App, content: string): boolean {
	const view = app.workspace.getActiveViewOfType(MarkdownView)

	if (!view) return false

	// Replaces the current selection if there is one, otherwise inserts at
	// the cursor. When several articles are added back-to-back (WikiMultiModal),
	// the cursor automatically moves to the end of the inserted content after
	// each insert, so the next article gets appended right after it.
	view.editor.replaceSelection(content)

	return true
}
/* ---------------- */

/* Added by aeelre0 */
async function createAndOpenNote(app: App, fileName: string, content: string) {
	let filePath = `${fileName}.md`
	let file

	try {
		file = await app.vault.create(filePath, content)
	} catch (error) {
		if (await app.vault.adapter.exists(filePath)) {
			let suffix = 2
			let candidatePath = `${fileName} (${suffix}).md`

			while (await app.vault.adapter.exists(candidatePath)) {
				suffix++
				candidatePath = `${fileName} (${suffix}).md`
			}

			filePath = candidatePath

			try {
				file = await app.vault.create(filePath, content)
			} catch (retryError) {
				new Notice(`Unable to create note "${fileName}".`)
				console.error(retryError)
				return
			}
		} else {
			new Notice(`Unable to create note "${fileName}".`)
			console.error(error)
			return
		}
	}

	const leaf = app.workspace.getLeaf()
	await leaf.openFile(file)
}
/* ---------------- */

async function cleanWikiHtml(title: string, countryPrefix: string) {
	const url = `https://${countryPrefix}.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(title)}`
	try {
		const response = await requestUrl({
			url,
			method: 'GET',
			headers: { 'User-Agent': 'WikiToMarkdown/1.1' },
		})
		const $ = cheerio.load(response.text)

		/* Added by aeelre0 */
		// BUGFIX: cheerio.load() parses the entire document here as
		// <html><head><title>…</title></head><body>…</body></html>. When
		// that <head>/<title> content gets re-serialized via $.html() and
		// handed to turndown, the article name (e.g. "Turkey") was leaking
		// through as a standalone line right after the h1 was stripped out.
		// Removing <head> entirely up front eliminates this at the source.
		$('head').remove()
		/* ---------------- */

		/* Added by aeelre0 */
		$('table.infobox').remove()
		/* ---------------- */

		$('style').remove()
		const $e = $('*')
		$e.removeAttr('rel')
		$e.removeAttr('about')
		return $
	} catch (error) {
		new Notice('Unable to fetch data from wikipedia.')
		console.error(error)
		return null
	}
}

/* Added by aeelre0 */
/*
 * BUGFIX: this function used to turn EVERY <img> tag in the document
 * (including ones inside tables) into a placeholder string. That meant the
 * $table.find('img') logic below (fixing protocol-relative src/srcset) never
 * actually ran, because by the time it got there the <img> tags inside
 * tables had already disappeared. Since tables used to be kept as raw HTML
 * in turndown (keep(['table', ...])), images inside tables need to survive
 * as real <img> elements. Fix: scope the figure/a/img selectors to exclude
 * anything inside a table, so table images keep being handled by their own
 * block instead.
 */
function processWikipediaImages($: cheerio.CheerioAPI): Map<string, string> {
	const imagePlaceholders = new Map<string, string>()
	let imageIndex = 0

	$('figure')
		.not('table figure')
		.each((_, figure) => {
			const $figure = $(figure)
			const $image = $figure.find('img').first()

			if (!$image.length) {
				$figure.remove()
				return
			}

			let source = $image.attr('src')

			if (source?.startsWith('//')) {
				source = `https:${source}`
			}

			if (!source) {
				$figure.remove()
				return
			}

			const caption = $figure.find('figcaption').text().trim()
			const placeholder = `AEELREIMAGE${imageIndex++}PLACEHOLDER`

			const replacement = caption
				? `\n\n**${caption}** — (see [image](${source}))\n\n`
				: `\n\n(see [image](${source}))\n\n`

			imagePlaceholders.set(placeholder, replacement)
			$figure.replaceWith(placeholder)
		})

	$('a')
		.not('table a')
		.each((_, link) => {
			const $link = $(link)
			const $image = $link.find('img').first()

			if (!$image.length) {
				return
			}

			let source = $image.attr('src')

			if (source?.startsWith('//')) {
				source = `https:${source}`
			}

			if (!source) {
				$link.remove()
				return
			}

			const caption = $image.attr('alt')?.trim() || ''
			const placeholder = `AEELREIMAGE${imageIndex++}PLACEHOLDER`

			const replacement = caption
				? `\n\n**${caption}** — (see [image](${source}))\n\n`
				: `\n\n(see [image](${source}))\n\n`

			imagePlaceholders.set(placeholder, replacement)
			$link.replaceWith(placeholder)
		})

	$('img')
		.not('table img')
		.each((_, image) => {
			const $image = $(image)

			let source = $image.attr('src')

			if (source?.startsWith('//')) {
				source = `https:${source}`
			}

			if (!source) {
				$image.remove()
				return
			}

			const caption = $image.attr('alt')?.trim() || ''
			const placeholder = `AEELREIMAGE${imageIndex++}PLACEHOLDER`

			const replacement = caption
				? `\n\n**${caption}** — (see [image](${source}))\n\n`
				: `\n\n(see [image](${source}))\n\n`

			imagePlaceholders.set(placeholder, replacement)
			$image.replaceWith(placeholder)
		})

	return imagePlaceholders
}
/* ---------------- */

/* Added by aeelre0 */
function normalizeWikipediaLinks($: cheerio.CheerioAPI, countryPrefix: string) {
	$('a').each((_, link) => {
		const $link = $(link)
		const href = $link.attr('href')

		if (!href) {
			return
		}

		if (
			href.startsWith('./File:') ||
			href.startsWith('./File%3A') ||
			href.startsWith('/wiki/File:')
		) {
			return
		}

		if (href.startsWith('./')) {
			$link.attr('href', `https://${countryPrefix}.wikipedia.org/wiki/${href.substring(2)}`)
			return
		}

		if (href.startsWith('/wiki/')) {
			$link.attr('href', `https://${countryPrefix}.wikipedia.org${href}`)
		}
	})
}
/* ---------------- */

/* Added by aeelre0 */
/*
 * Wikipedia tables are no longer left as raw HTML in the note (previously
 * turndownService.keep([...]) kept them verbatim, which made Obsidian
 * render "embedded HTML" instead of an actual table). Instead, the
 * functions below convert a table into a real Markdown ("| a | b |" style,
 * triggering Obsidian's native table view) table.
 *
 * Markdown tables don't support rowspan/colspan (cell merging). So:
 *  - Single-cell "banner" rows that span the full width (e.g. the "v t e"
 *    navbox header in Wikipedia templates) are dropped from the table
 *    entirely.
 *  - The text of a colspan'd cell is written into the first column, and
 *    the remaining columns are left empty (to keep alignment intact).
 *  - Tables containing rowspan can't be expressed properly in Markdown, so
 *    as a safe fallback they're kept as raw HTML.
 */

function cleanTableCellText(turndownService: TurndownService, html: string): string {
	const converted = turndownService.turndown(html)

	return converted
		.replace(/\r?\n+/g, ' ')
		.replace(/\|/g, '\\|')
		.replace(/\s+/g, ' ')
		.trim()
}

interface ParsedTableCell {
	text: string
	colSpan: number
	isHeader: boolean
}

interface ParsedTableRow {
	cells: ParsedTableCell[]
	hasRowSpan: boolean
}

function expandRowToColumns(row: ParsedTableRow, columnCount: number): string[] {
	const expanded: string[] = []

	for (const cell of row.cells) {
		expanded.push(cell.text)
		for (let i = 1; i < cell.colSpan; i++) {
			expanded.push('')
		}
	}

	while (expanded.length < columnCount) {
		expanded.push('')
	}

	return expanded.slice(0, columnCount)
}

function convertTableToMarkdown(table: Element, turndownService: TurndownService): string {
	const captionEl = table.querySelector(':scope > caption')
	const captionText = captionEl ? cleanTableCellText(turndownService, captionEl.innerHTML) : ''

	const rowEls = Array.from(table.querySelectorAll('tr'))
	const parsedRows: ParsedTableRow[] = []

	for (const rowEl of rowEls) {
		const cellEls = Array.from(rowEl.querySelectorAll(':scope > th, :scope > td'))
		if (cellEls.length === 0) continue

		let hasRowSpan = false

		const cells: ParsedTableCell[] = cellEls.map((cellEl) => {
			const colSpanAttr = parseInt(cellEl.getAttribute('colspan') ?? '1', 10)
			const rowSpanAttr = parseInt(cellEl.getAttribute('rowspan') ?? '1', 10)

			if (!Number.isNaN(rowSpanAttr) && rowSpanAttr > 1) {
				hasRowSpan = true
			}

			return {
				text: cleanTableCellText(turndownService, cellEl.innerHTML),
				colSpan: !Number.isNaN(colSpanAttr) && colSpanAttr > 0 ? colSpanAttr : 1,
				isHeader: cellEl.tagName.toLowerCase() === 'th',
			}
		})

		parsedRows.push({ cells, hasRowSpan })
	}

	const multiCellRows = parsedRows.filter((row) => row.cells.length > 1)

	const hasUnsupportedRowSpan = parsedRows.some((row) => row.hasRowSpan)

	if (multiCellRows.length === 0 || hasUnsupportedRowSpan) {
		// Complex/unsupported table structure: fall back to raw HTML
		// (the same behavior as before) so we don't lose any data.
		return `\n${(table as HTMLElement).outerHTML}\n`
	}

	const columnCount = Math.max(
		...multiCellRows.map((row) => row.cells.reduce((sum, cell) => sum + cell.colSpan, 0)),
	)

	const headerRow =
		multiCellRows.find((row) => row.cells.every((cell) => cell.isHeader)) ?? multiCellRows[0]

	const dataRows = multiCellRows.filter((row) => row !== headerRow)

	const headerLine = `| ${expandRowToColumns(headerRow, columnCount).join(' | ')} |`
	const separatorLine = `| ${Array(columnCount).fill('---').join(' | ')} |`
	const dataLines = dataRows.map((row) => `| ${expandRowToColumns(row, columnCount).join(' | ')} |`)

	const tableMarkdown = [headerLine, separatorLine, ...dataLines].join('\n')

	return captionText ? `\n**${captionText}**\n\n${tableMarkdown}\n` : `\n${tableMarkdown}\n`
}
/* ---------------- */

async function fetchWikipediaMarkdown(
	title: string,
	settings: WikiPluginSettings,
): Promise<string> {
	const $ = await cleanWikiHtml(title, settings.countryPrefix)
	if (!$) return ''

	/* Added by aeelre0 */
	const references: string[] = []
	const referenceIds = new Map<string, number>()
	const referenceElements = new Map<string, string>()
	/* ---------------- */

	/* Added by aeelre0 */
	$('[id]').each((_, element) => {
		const id = $(element).attr('id')

		if (id) {
			referenceElements.set(id, $(element).text().trim())
		}
	})
	/* ---------------- */

	/* Added by aeelre0 */
	$('.hatnote').remove()
	/* ---------------- */

	/*
	 * Original image processing code preserved for licensing/history.
	 *
	 * $('figure').each((index, figure) => {
	 * 	const $figure = $(figure)
	 * 	const $image = $figure.find('img').first()
	 *
	 * 	if (!$image.length) {
	 * 		$figure.remove()
	 * 		return
	 * 	}
	 *
	 * 	let imageSource = $image.attr('src')
	 *
	 * 	if (imageSource?.startsWith('//')) {
	 * 		imageSource = `https:${imageSource}`
	 * 	}
	 *
	 * 	if (!imageSource) {
	 * 		$figure.remove()
	 * 		return
	 * 	}
	 *
	 * 	const caption = $figure.find('figcaption').text().trim()
	 * 	const alt = $image.attr('alt')?.trim() || caption || 'image'
	 *
	 * 	const placeholder = `AEELRE_FIGURE_${index}_END`
	 *
	 * 	const imageMarkdown = `![${alt}](${imageSource})`
	 *
	 * 	const figureMarkdown = caption
	 * 		? `\n${imageMarkdown}\n\n*${caption}*\n`
	 * 		: `\n${imageMarkdown}\n`
	 *
	 * 	imagePlaceholders.set(placeholder, figureMarkdown)
	 *
	 * 	$figure.replaceWith(placeholder)
	 * })
	 */

	/*
	$('sup').each((_, sup) => {
		const $sup = $(sup)
		const $a = $sup.find('a')

		const href = $a.attr('href')
		const text = $a.text().replace(/[[\]]/g, '')

		if (href?.includes('#cite_note')) {
			$sup.replaceWith(`[${text}]`)
		}
	})
	*/

	/* Added by aeelre0 */
	$('sup.reference').each((_, sup) => {
		const $sup = $(sup)
		const $link = $sup.find('a').first()

		const href = $link.attr('href')

		if (!href?.includes('#cite_note')) {
			$sup.remove()
			return
		}

		const referenceId = href.split('#')[1]

		if (!referenceId) {
			$sup.remove()
			return
		}

		if (!referenceIds.has(referenceId)) {
			const reference = referenceElements.get(referenceId)

			if (reference) {
				const referenceNumber = references.length + 1

				referenceIds.set(referenceId, referenceNumber)
				references.push(reference)
			}
		}

		$sup.remove()
	})
	/* ---------------- */

	/* Added by aeelre0 */
	const imagePlaceholders = processWikipediaImages($)
	/* ---------------- */

	/* Added by aeelre0 */
	normalizeWikipediaLinks($, settings.countryPrefix)
	/* ---------------- */

	$('table').each((_, table) => {
		const $table = $(table)

		$table.removeAttr('id')
		$table.removeAttr('class')
		$table.removeAttr('typeof')
		$table.removeAttr('data-mw')
		$table.removeAttr('summary')
		$table.removeAttr('cellpadding')

		$table.find('*').each((_, child) => {
			const $child = $(child)

			$child.removeAttr('id')
			$child.removeAttr('class')
			$child.removeAttr('typeof')
			$child.removeAttr('data-mw')
			$child.removeAttr('about')
			$child.removeAttr('resource')
			$child.removeAttr('rel')
			$child.removeAttr('xmlns')
		})

		$table.find('img').each((_, img) => {
			const $img = $(img)

			let src = $img.attr('src')

			if (src?.startsWith('//')) {
				src = `https:${src}`
				$img.attr('src', src)
			}

			let srcset = $img.attr('srcset')

			if (srcset?.startsWith('//')) {
				srcset = `https:${srcset}`
				$img.attr('srcset', srcset)
			}

			$img.removeAttr('resource')
		})

		/* Added by aeelre0 */
		// Note: since tables are now normally converted into a real
		// Markdown pipe table, this style attribute usually goes unused
		// (plain Markdown tables have no background/border color). It only
		// still matters when convertTableToMarkdown falls back to raw HTML
		// (outerHTML) because of an unsupported structure like rowspan.
		$table.attr(
			'style',
			`background-color: ${settings.tableBackground}; border: 1px solid ${settings.tableBackground}; overflow: auto;`,
		)
		/* ---------------- */
	})

	$('script, style, noscript, iframe, meta, link').remove()

	$('.mw-editsection, .noprint, .metadata, .navbox, .reflist, .references').remove()

	$('*').each((_, el) => {
		const $el = $(el)

		$el.removeAttr('id')
		$el.removeAttr('typeof')
		$el.removeAttr('data-mw')
		$el.removeAttr('about')
		$el.removeAttr('rel')
		$el.removeAttr('resource')
		$el.removeAttr('xmlns')
	})

	/* Added by aeelre0 */
	$('h1').replaceWith('___')
	/* ---------------- */

	const cleanedHTML = $.html()
	const turndownService = new TurndownService()

	/* Added by aeelre0 */
	// This used to be turndownService.keep([...]) which kept tables as raw
	// HTML. Now we use a custom rule that converts them into a real
	// Obsidian table (pipe syntax); see convertTableToMarkdown /
	// expandRowToColumns above.
	turndownService.addRule('wikiTable', {
		filter: 'table',
		replacement: (_content: string, node: Node) => {
			return convertTableToMarkdown(node as Element, turndownService)
		},
	})
	/* ---------------- */

	turndownService.addRule('codeBlock', {
		filter: 'pre',
		replacement: (_content: string, node: Node) => {
			const text = node.textContent ?? ''
			return `\n\`\`\`\n${text.trim()}\n\`\`\`\n`
		},
	})

	turndownService.addRule('inlineCode', {
		filter: (node: Node) => {
			return (
				node.nodeName.toLowerCase() === 'code' && node.parentNode?.nodeName.toLowerCase() !== 'pre'
			)
		},
		replacement: (content: string) => {
			return `\`${content}\``
		},
	})

	/* Added by aeelre0 */
	turndownService.addRule('underscoreHeaders', {
		filter: ['h2', 'h3', 'h4', 'h5', 'h6'],
		replacement: (content: string, node: Node) => {
			const sourceLevel = parseInt(node.nodeName.substring(1))
			const level = sourceLevel - 1

			return `\n${'#'.repeat(level)} ${content.trim()}\n`
		},
	})
	/* ---------------- */

	turndownService.addRule('unwrapGenericHtml', {
		filter: ['div', 'span', 'section', 'article'],
		replacement: (content: string) => content,
	})

	let markdown = turndownService.turndown(cleanedHTML).replace(/\\([*#_~`>])/g, '$1')

	/* Added by aeelre0 */
	for (const [placeholder, imageReference] of imagePlaceholders) {
		markdown = markdown.split(placeholder).join(imageReference)
	}

	markdown = markdown.replace(/\n(?=#{1,6} )/g, '\n\n___\n\n')

	// If the article starts right with a heading, avoid a redundant "___"
	// showing up twice in a row right after the outer top-of-note "___".
	markdown = markdown.replace(/^___\n+___\n+/, '___\n\n')
	/* ---------------- */

	if (references.length === 0) {
		return `___\n\n${markdown.trim()}\n\n___\n`
	}

	/* Added by aeelre0 */
	const referenceMarkdown = references
		.map((reference, index) => `${index + 1}. ${reference}`)
		.join('\n')

	return `___\n\n${markdown.trim()}\n\n## References\n\n${referenceMarkdown}\n\n___\n`
	/* ---------------- */
}

export default WikipediaNote
