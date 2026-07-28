{ foreach from=$menu.category_list item=category name=category }
	{ if $smarty.session.idcategory==$category->escat_id }    
    <div class="m_menu"><a {if $category->escat_link != ''}href="http://{ $category->escat_link }"  { if $category->escat_target=='_blank' }onclick="javascript: target='new'" { /if } { else } href="{ $category->escat_id }/{ $category->escat_urlname }/kategoria.html" { /if}><img src="images/menu/{$category->escat_id}_a.gif" alt=""  /></a></div>
	{ else }
    <div class="m_menu"><a {if $category->escat_link != ''}href="http://{ $category->escat_link }"  { if $category->escat_target=='_blank' }onclick="javascript: target='new'" { /if } { else } href="{ $category->escat_id }/{ $category->escat_urlname }/kategoria.html" { /if}><img src="images/menu/{$category->escat_id}.gif" alt="" onmouseover="javascript: this.src='images/menu/{$category->escat_id}_a.gif'" onmouseout="javascript: this.src='images/menu/{$category->escat_id}.gif'" /></a></div>	
	{ /if }
{ /foreach } 



