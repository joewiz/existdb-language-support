xquery version "3.1";

declare variable $exist:path external;
declare variable $exist:resource external;
declare variable $exist:controller external;

if (starts-with($exist:path, "/api/")) then
    <dispatch xmlns="http://exist.sourceforge.net/NS/exist">
        <forward url="{$exist:controller}/modules/api/router.xq"/>
    </dispatch>
else
    <dispatch xmlns="http://exist.sourceforge.net/NS/exist">
        <cache-control cache="yes"/>
    </dispatch>
