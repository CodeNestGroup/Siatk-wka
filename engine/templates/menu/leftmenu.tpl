{ foreach from=$menu.left_menu item=category name=category}
{ if $Interface->getGETVariable('idcat')==$category->escat_id }
<div class="sup_menu"><a class="sup_menu_a_active" href="{$category->escat_id}/{$category->escat_parent}/{$category->escat_urlname}/kategoria.html">{ $category->escat_title }</a></div>
{ else }
<div class="sup_menu"><a class="sup_menu_a" href="{$category->escat_id}/{$category->escat_parent}/{$category->escat_urlname}/kategoria.html">{ $category->escat_title }</a></div>
{ /if }
{ /foreach }