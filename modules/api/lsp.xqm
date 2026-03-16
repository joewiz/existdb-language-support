(:
 :  Language Support API — wraps eXist-db lsp:* functions for IDE clients.
 :)
xquery version "3.1";

module namespace lsp-api="http://exist-db.org/apps/language-support/api";

import module namespace lsp="http://exist-db.org/xquery/lsp";

(:~
 : POST /api/diagnostics — Multi-error diagnostics for XQuery source.
 :
 : @param $request Roaster request map with JSON body {query, base}
 : @return array of diagnostic maps with 0-indexed line/column
 :)
declare function lsp-api:diagnostics($request as map(*)) {
    let $body := $request?body
    let $query := $body?query
    let $base := $body?base
    return lsp:diagnostics($query, $base)
};

(:~
 : POST /api/symbols — Document symbols (functions, variables).
 :
 : @param $request Roaster request map with JSON body {query, base}
 : @return array of symbol maps
 :)
declare function lsp-api:symbols($request as map(*)) {
    let $body := $request?body
    let $query := $body?query
    let $base := $body?base
    return lsp:symbols($query, $base)
};

(:~
 : POST /api/completions — Function and variable completions.
 :
 : Accepts optional prefix for server-side filtering.
 :
 : @param $request Roaster request map with JSON body {query, base, prefix?}
 : @return array of completion item maps
 :)
declare function lsp-api:completions($request as map(*)) {
    let $body := $request?body
    let $query := $body?query
    let $prefix := ($body?prefix, "")[1]
    let $base := $body?base
    let $completions := lsp:completions($query, $base)
    return array {
        for $item in $completions?*
        let $name := replace($item?label, "#\d+$", "")
        where $prefix = "" or starts-with($name, $prefix)
        return $item
    }
};

(:~
 : POST /api/hover — Hover info for symbol at position.
 :
 : @param $request Roaster request map with JSON body {query, line, column, base}
 : @return hover map or empty map
 :)
declare function lsp-api:hover($request as map(*)) {
    let $body := $request?body
    let $query := $body?query
    let $line := xs:integer($body?line)
    let $column := xs:integer($body?column)
    let $base := $body?base
    let $hover := lsp:hover($query, $line, $column, $base)
    return
        if (exists($hover)) then
            $hover
        else
            map {}
};

(:~
 : POST /api/definition — Go-to-definition for symbol at position.
 :
 : @param $request Roaster request map with JSON body {query, line, column, base}
 : @return definition location map or empty map
 :)
declare function lsp-api:definition($request as map(*)) {
    let $body := $request?body
    let $query := $body?query
    let $line := xs:integer($body?line)
    let $column := xs:integer($body?column)
    let $base := $body?base
    let $def := lsp:definition($query, $line, $column, $base)
    return
        if (exists($def)) then
            $def
        else
            map {}
};

(:~
 : POST /api/references — Find all references to symbol at position.
 :
 : @param $request Roaster request map with JSON body {query, line, column, base}
 : @return array of reference location maps
 :)
declare function lsp-api:references($request as map(*)) {
    let $body := $request?body
    let $query := $body?query
    let $line := xs:integer($body?line)
    let $column := xs:integer($body?column)
    let $base := $body?base
    return lsp:references($query, $line, $column, $base)
};
