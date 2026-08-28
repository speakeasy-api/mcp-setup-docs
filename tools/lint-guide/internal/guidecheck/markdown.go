package guidecheck

import (
	"bytes"
	"regexp"
	"sort"
	"unicode/utf8"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/text"
	"github.com/yuin/goldmark/util"
)

var renderedURLRE = regexp.MustCompile("(?i)https?://[^\\s<>\"'`]+")

// URLPlacementViolation describes a rendered URL outside an allowed construct.
type URLPlacementViolation struct {
	Source string
	Line   int
	Column int
}

type sourceRange struct{ Start, End int }

type projectionMode uint8

const (
	projectionDecoded projectionMode = iota
	projectionLiteral
)

type projectionPiece struct {
	Rendered               []byte
	SourceStart, SourceEnd int
	offsets                []sourceRange
}
type projection struct {
	pieces              []projectionPiece
	regions, exclusions []sourceRange
}

type sourceLayout struct {
	labelClose []int
	lineRanges []sourceRange
	linePieces []projectionPiece
}

type walkFrame struct {
	node         ast.Node
	maxEnd       int
	regionIndex  int
	titles       []sourceRange
	destinations []sourceRange
}

// FindURLPlacementViolations reports rendered HTTP(S) text using one-based
// source byte coordinates.
func FindURLPlacementViolations(source []byte) []URLPlacementViolation {
	context := parser.NewContext()
	root := goldmark.DefaultParser().Parse(text.NewReader(source), parser.WithContext(context))
	layout := indexSource(source, root)
	p := buildProjection(source, root, layout)
	p.pieces = mergeOrderedPieces(p.pieces, layout.linePieces)
	regions := mergeOrderedRanges(mergeOrderedRangeLists(p.regions, layout.lineRanges))
	exclusions := mergeOrderedRanges(p.exclusions)
	lineStarts := sourceLineStarts(source)
	var out []URLPlacementViolation
	pieceIndex, exclusionIndex := 0, 0
	for _, region := range regions {
		start := region.Start
		for exclusionIndex < len(exclusions) && exclusions[exclusionIndex].End <= start {
			exclusionIndex++
		}
		for exclusionIndex < len(exclusions) && exclusions[exclusionIndex].Start < region.End {
			exclusion := exclusions[exclusionIndex]
			if start < exclusion.Start {
				out = scanProjection(source, p.pieces, &pieceIndex, sourceRange{start, min(exclusion.Start, region.End)}, lineStarts, out)
			}
			start = max(start, exclusion.End)
			if exclusion.End > region.End {
				break
			}
			exclusionIndex++
		}
		if start < region.End {
			out = scanProjection(source, p.pieces, &pieceIndex, sourceRange{start, region.End}, lineStarts, out)
		}
	}
	return out
}

func buildProjection(source []byte, root ast.Node, layout sourceLayout) projection {
	p := projection{}
	stack := make([]walkFrame, 0, 16)
	_ = ast.Walk(root, func(node ast.Node, entering bool) (ast.WalkStatus, error) {
		if entering {
			frame := walkFrame{node: node, maxEnd: node.Pos(), regionIndex: -1}
			status := ast.WalkContinue
			switch n := node.(type) {
			case *ast.FencedCodeBlock:
				status = ast.WalkSkipChildren
			case *ast.AutoLink:
				start := n.Pos()
				if end := bytes.IndexByte(source[start:], '>'); end >= 0 {
					frame.destinations = []sourceRange{{start, start + end + 1}}
					frame.maxEnd = start + end + 1
				}
				status = ast.WalkSkipChildren
			case *ast.Text:
				mode := projectionDecoded
				if len(stack) > 0 {
					if _, inCodeSpan := stack[len(stack)-1].node.(*ast.CodeSpan); inCodeSpan {
						mode = projectionLiteral
					}
				}
				addPiece(&p, source, sourceRange{n.Segment.Start, n.Segment.Stop}, mode)
				frame.maxEnd = n.Segment.Stop
			case *ast.RawHTML:
				for i := 0; i < n.Segments.Len(); i++ {
					s := n.Segments.At(i)
					addPiece(&p, source, sourceRange{s.Start, s.Stop}, projectionLiteral)
					frame.maxEnd = max(frame.maxEnd, s.Stop)
				}
			case *ast.CodeBlock:
				frame.maxEnd = addSegments(&p, source, n.Lines(), frame.maxEnd, projectionLiteral)
			case *ast.HTMLBlock:
				frame.maxEnd = addSegments(&p, source, n.Lines(), frame.maxEnd, projectionLiteral)
			case *ast.Emphasis:
				frame.regionIndex = len(p.regions)
				p.regions = append(p.regions, sourceRange{Start: n.Pos()})
			case *ast.Link, *ast.Image:
				frame.destinations, frame.titles = recoverLinkRanges(source, node, layout)
			case *ast.LinkReferenceDefinition:
				frame.destinations, frame.titles = recoverDefinitionRanges(source, n, layout)
			}
			stack = append(stack, frame)
			return status, nil
		}

		frame := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		if emphasis, ok := frame.node.(*ast.Emphasis); ok {
			frame.maxEnd += emphasis.Level
			if frame.maxEnd <= len(source) {
				p.regions[frame.regionIndex].End = frame.maxEnd
			}
		}
		p.exclusions = append(p.exclusions, frame.destinations...)
		for _, title := range frame.titles {
			addPiece(&p, source, title, projectionDecoded)
		}
		if len(stack) > 0 {
			parent := &stack[len(stack)-1]
			parent.maxEnd = max(parent.maxEnd, frame.maxEnd)
		}
		return ast.WalkContinue, nil
	})
	return p
}

func addSegments(p *projection, source []byte, segments *text.Segments, end int, mode projectionMode) int {
	for i := 0; i < segments.Len(); i++ {
		s := segments.At(i)
		addPiece(p, source, sourceRange{s.Start, s.Stop}, mode)
		end = max(end, s.Stop)
	}
	return end
}

func addPiece(p *projection, source []byte, r sourceRange, mode projectionMode) {
	if r.Start < 0 || r.End <= r.Start || r.End > len(source) {
		return
	}
	rendered, offsets := decodeProjection(source, r, mode)
	p.pieces = append(p.pieces, projectionPiece{rendered, r.Start, r.End, offsets})
	p.regions = append(p.regions, r)
}

func decodeProjection(source []byte, r sourceRange, mode projectionMode) ([]byte, []sourceRange) {
	if mode == projectionLiteral {
		rendered := append([]byte(nil), source[r.Start:r.End]...)
		offsets := make([]sourceRange, len(rendered))
		for i := range rendered {
			offsets[i] = sourceRange{r.Start + i, r.Start + i + 1}
		}
		return rendered, offsets
	}
	var rendered []byte
	var offsets []sourceRange
	for i := r.Start; i < r.End; {
		end := i + 1
		decoded := source[i:end]
		if source[i] == '\\' && end < r.End && isASCIIPunctuation(source[end]) {
			end++
			decoded = source[i+1 : end]
		} else if source[i] == '&' {
			if semi := bytes.IndexByte(source[i:min(r.End, i+34)], ';'); semi >= 0 {
				candidateEnd := i + semi + 1
				candidate := source[i:candidateEnd]
				resolved := util.ResolveEntityNames(util.ResolveNumericReferences(candidate))
				if !bytes.Equal(resolved, candidate) {
					end, decoded = candidateEnd, resolved
				}
			}
		} else if source[i] >= utf8.RuneSelf {
			_, size := utf8.DecodeRune(source[i:r.End])
			end = i + size
			decoded = source[i:end]
		}
		rendered = append(rendered, decoded...)
		for range decoded {
			offsets = append(offsets, sourceRange{i, end})
		}
		i = end
	}
	return rendered, offsets
}

func isASCIIPunctuation(b byte) bool {
	return b >= '!' && b <= '~' && !((b >= '0' && b <= '9') || (b >= 'A' && b <= 'Z') || (b >= 'a' && b <= 'z'))
}

func scanProjection(source []byte, pieces []projectionPiece, pieceIndex *int, region sourceRange, lineStarts []int, out []URLPlacementViolation) []URLPlacementViolation {
	for *pieceIndex < len(pieces) && pieces[*pieceIndex].SourceEnd <= region.Start {
		*pieceIndex++
	}
	var rendered []byte
	var offsets []sourceRange
	index := *pieceIndex
	for index < len(pieces) && pieces[index].SourceStart < region.End {
		piece := pieces[index]
		if piece.SourceStart >= region.Start && piece.SourceEnd <= region.End {
			rendered = append(rendered, piece.Rendered...)
			offsets = append(offsets, piece.offsets...)
		}
		index++
	}
	*pieceIndex = index
	for i := range offsets {
		next := region.End
		if i+1 < len(offsets) {
			next = offsets[i+1].Start
		}
		offsets[i].End = max(offsets[i].End, next)
	}
	for _, match := range renderedURLRE.FindAllIndex(rendered, -1) {
		first, last := offsets[match[0]], offsets[match[1]-1]
		line, column := sourcePointFromStarts(lineStarts, first.Start)
		out = append(out, URLPlacementViolation{string(source[first.Start:last.End]), line, column})
	}
	return out
}

func indexSource(source []byte, root ast.Node) sourceLayout {
	layout := sourceLayout{labelClose: make([]int, len(source))}
	codeClose := make([]int, len(source))
	for i := range layout.labelClose {
		layout.labelClose[i], codeClose[i] = -1, -1
	}
	_ = ast.Walk(root, func(node ast.Node, entering bool) (ast.WalkStatus, error) {
		span, ok := node.(*ast.CodeSpan)
		if !entering || !ok || span.FirstChild() == nil {
			return ast.WalkContinue, nil
		}
		start := span.Pos()
		opener := 0
		for start+opener < len(source) && source[start+opener] == '`' {
			opener++
		}
		for i := span.LastChild().(*ast.Text).Segment.Stop; i < len(source); {
			if source[i] != '`' {
				i++
				continue
			}
			run := 1
			for i+run < len(source) && source[i+run] == '`' {
				run++
			}
			if run == opener {
				codeClose[start] = i + run
				break
			}
			i += run
		}
		return ast.WalkSkipChildren, nil
	})
	brackets := make([]int, 0, 16)
	for i := 0; i < len(source); i++ {
		if source[i] == '\\' {
			i++
			continue
		}
		if codeClose[i] >= 0 {
			i = codeClose[i] - 1
			continue
		}
		switch source[i] {
		case '[':
			brackets = append(brackets, i)
		case ']':
			if len(brackets) > 0 {
				open := brackets[len(brackets)-1]
				brackets = brackets[:len(brackets)-1]
				layout.labelClose[open] = i
			}
		}
	}
	for i := 0; i < len(source); i++ {
		if source[i] != '\r' && source[i] != '\n' {
			continue
		}
		end := i + 1
		if source[i] == '\r' && end < len(source) && source[end] == '\n' {
			end++
		}
		r := sourceRange{i, end}
		rendered, offsets := decodeProjection(source, r, projectionLiteral)
		layout.lineRanges = append(layout.lineRanges, r)
		layout.linePieces = append(layout.linePieces, projectionPiece{rendered, r.Start, r.End, offsets})
		i = end - 1
	}
	return layout
}

func recoverLinkRanges(source []byte, node ast.Node, layout sourceLayout) (destinations, titles []sourceRange) {
	open := node.Pos()
	if _, ok := node.(*ast.Image); ok {
		open++
	}
	close := indexedLabelClose(layout, open)
	if close < 0 || close+1 >= len(source) {
		return nil, nil
	}
	next := close + 1
	if source[next] == '(' {
		destination, title, _ := recoverResource(source, next)
		if destination.End > destination.Start {
			destinations = append(destinations, destination)
		}
		if title.End > title.Start {
			titles = append(titles, title)
		}
		return destinations, titles
	}
	var reference *ast.ReferenceLink
	switch n := node.(type) {
	case *ast.Link:
		reference = n.Reference
	case *ast.Image:
		reference = n.Reference
	}
	if reference != nil && (reference.Type == ast.ReferenceLinkFull || reference.Type == ast.ReferenceLinkCollapsed) && next < len(source) && source[next] == '[' {
		if end := indexedLabelClose(layout, next); end >= 0 {
			destinations = append(destinations, sourceRange{next, end + 1})
		}
	}
	return destinations, nil
}

func indexedLabelClose(layout sourceLayout, open int) int {
	if open < 0 || open >= len(layout.labelClose) {
		return -1
	}
	return layout.labelClose[open]
}

func recoverResource(source []byte, open int) (destination, title sourceRange, end int) {
	i := open + 1
	for i < len(source) && isMarkdownSpace(source[i]) {
		i++
	}
	if i >= len(source) {
		return destination, title, -1
	}
	if source[i] == '<' {
		start := i + 1
		for i = start; i < len(source); i++ {
			if source[i] == '\\' {
				i++
				continue
			}
			if source[i] == '>' {
				destination = sourceRange{start, i}
				i++
				break
			}
		}
	} else {
		start, depth := i, 0
		for ; i < len(source); i++ {
			if source[i] == '\\' {
				i++
				continue
			}
			if source[i] == '(' {
				depth++
			}
			if source[i] == ')' {
				if depth == 0 {
					break
				}
				depth--
			}
			if depth == 0 && isMarkdownSpace(source[i]) {
				break
			}
		}
		destination = sourceRange{start, i}
	}
	for i < len(source) && isMarkdownSpace(source[i]) {
		i++
	}
	if i < len(source) && (source[i] == '"' || source[i] == 39 || source[i] == '(') {
		closing := source[i]
		if closing == '(' {
			closing = ')'
		}
		start := i + 1
		for i = start; i < len(source); i++ {
			if source[i] == '\\' {
				i++
				continue
			}
			if source[i] == closing {
				title = sourceRange{start, i}
				i++
				break
			}
		}
	}
	return destination, title, i
}

func recoverDefinitionRanges(source []byte, node *ast.LinkReferenceDefinition, layout sourceLayout) (destinations, titles []sourceRange) {
	start := node.Pos()
	definitionEnd := start
	for i := 0; i < node.Lines().Len(); i++ {
		definitionEnd = max(definitionEnd, node.Lines().At(i).Stop)
	}
	close := indexedLabelClose(layout, start)
	if close < 0 {
		return nil, nil
	}
	i := close + 1
	if i >= len(source) || source[i] != ':' {
		return nil, nil
	}
	i++
	for i < definitionEnd && (source[i] == ' ' || source[i] == '\t') {
		i++
	}
	if i < definitionEnd && (source[i] == '\r' || source[i] == '\n') {
		if source[i] == '\r' && i+1 < definitionEnd && source[i+1] == '\n' {
			i++
		}
		i++
		for i < definitionEnd && (source[i] == ' ' || source[i] == '\t') {
			i++
		}
	}
	destinationStart := i
	if i < definitionEnd && source[i] == '<' {
		destinationStart = i + 1
		if relative := bytes.IndexByte(source[destinationStart:definitionEnd], '>'); relative >= 0 {
			i = destinationStart + relative
		}
	} else {
		for i < definitionEnd && !isMarkdownSpace(source[i]) {
			i++
		}
	}
	if i > destinationStart {
		destinations = append(destinations, sourceRange{destinationStart, i})
	}
	if i < definitionEnd && source[i] == '>' {
		i++
	}
	for i < definitionEnd && (source[i] == ' ' || source[i] == '\t') {
		i++
	}
	if i < definitionEnd && (source[i] == '\r' || source[i] == '\n') {
		if source[i] == '\r' && i+1 < definitionEnd && source[i+1] == '\n' {
			i++
		}
		i++
		for i < definitionEnd && (source[i] == ' ' || source[i] == '\t') {
			i++
		}
	}
	if i < definitionEnd && (source[i] == '"' || source[i] == 39 || source[i] == '(') {
		closing := source[i]
		if closing == '(' {
			closing = ')'
		}
		titleStart := i + 1
		for i = titleStart; i < definitionEnd; i++ {
			if source[i] == '\\' {
				i++
				continue
			}
			if source[i] == closing {
				titles = append(titles, sourceRange{titleStart, i})
				break
			}
		}
	}
	return destinations, titles
}

func isMarkdownSpace(b byte) bool { return b == ' ' || b == '\t' || b == '\n' || b == '\r' }

func mergeOrderedRanges(ranges []sourceRange) []sourceRange {
	merged := make([]sourceRange, 0, len(ranges))
	for _, r := range ranges {
		if r.End <= r.Start {
			continue
		}
		if len(merged) > 0 && r.Start <= merged[len(merged)-1].End {
			merged[len(merged)-1].End = max(merged[len(merged)-1].End, r.End)
		} else {
			merged = append(merged, r)
		}
	}
	return merged
}

func mergeOrderedRangeLists(left, right []sourceRange) []sourceRange {
	merged := make([]sourceRange, 0, len(left)+len(right))
	for i, j := 0, 0; i < len(left) || j < len(right); {
		if j == len(right) || (i < len(left) && left[i].Start <= right[j].Start) {
			merged = append(merged, left[i])
			i++
		} else {
			merged = append(merged, right[j])
			j++
		}
	}
	return merged
}

func mergeOrderedPieces(left, right []projectionPiece) []projectionPiece {
	merged := make([]projectionPiece, 0, len(left)+len(right))
	for i, j := 0, 0; i < len(left) || j < len(right); {
		if j == len(right) || (i < len(left) && left[i].SourceStart <= right[j].SourceStart) {
			merged = append(merged, left[i])
			i++
		} else {
			merged = append(merged, right[j])
			j++
		}
	}
	return merged
}

func projectVisible(source []byte, root ast.Node, excluded []sourceRange) []projectionPiece {
	layout := indexSource(source, root)
	p := buildProjection(source, root, layout)
	p.exclusions = append(p.exclusions, excluded...)
	return mergeOrderedPieces(p.pieces, layout.linePieces)
}

func sourceLineStarts(source []byte) []int {
	starts := []int{0}
	for i := 0; i < len(source); i++ {
		if source[i] == '\r' {
			if i+1 < len(source) && source[i+1] == '\n' {
				i++
			}
			starts = append(starts, i+1)
		} else if source[i] == '\n' {
			starts = append(starts, i+1)
		}
	}
	return starts
}

func sourcePointFromStarts(starts []int, offset int) (line, column int) {
	index := sort.Search(len(starts), func(i int) bool { return starts[i] > offset }) - 1
	return index + 1, offset - starts[index] + 1
}

func sourcePoint(source []byte, offset int) (line, column int) {
	return sourcePointFromStarts(sourceLineStarts(source), offset)
}
