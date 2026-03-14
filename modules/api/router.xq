xquery version "3.1";

declare namespace output="http://www.w3.org/2010/xslt-xquery-serialization";

import module namespace roaster="http://e-editiones.org/roaster";
import module namespace lsp-api="http://exist-db.org/apps/language-support/api" at "lsp.xqm";

declare variable $local:definitions := "modules/api.json";

declare function local:lookup($name as xs:string) {
    function-lookup(xs:QName($name), 1)
};

roaster:route($local:definitions, local:lookup#1)
