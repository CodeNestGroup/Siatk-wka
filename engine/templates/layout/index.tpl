{ include file="layout/includes/begin_site.tpl" }
{ literal }
<script type="text/javascript">
// <![CDATA[
	function show_sub(id,total){
		document.getElementById('div_menu_'+id).style.display='block';
	}

	function hide_sub(total){
		for(i=1;i<=total;i++){
			document.getElementById('div_menu_'+i).style.display='none';
		}
	}

// ]]>
</script>
{ /literal }
<!-- admin menu begin-->

<div id="outer_container">
    <div id="inner_container">
<div id="header">
    <div id="header_text">Dzisiaj jest: <strong>{ $smarty.now|date_format:"%Y-%m-%d" }</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
    <a style="color: red;" href="/admin">zaloguj</a>
    </div>
</div>


<div class="baner" style="width:90%; margin: 0 auto;"><a href="https://ecomagia.raypath.info/Products/Details?id=306" target="_blank"><img src="/images/Baner podłużny.jpg" style="width:100%; padding-top: 2%;"></a></div>
<!-- przełacznik shop/content tutaj był -->
<script type="text/javascript" src="js/advajax.js"></script>
<div class="above" id="comment_window">
<div id="closebutton" class="closebutton" onclick="closeComment()" title="zamknij"></div>
<div style="clear: both;"></div>
<table style="margin-left: 10px;">
        <tr>
                <td colspan="2"><div style="color:white;">Komentarz: </div><td>
        </tr>
        <tr>
                <td colspan="2">
                        <textarea id="escom_desc" style="float: left;" cols="39" rows="6" wrap="OFF" maxlength="250"></textarea>
                </td>
        </tr>
        <tr>
                <td align="center" colspan="2">
                    <div class="comment_submit" id="comment" onclick="saveComment()" title="potwierdź" ></div>
                </td>
        </tr>
        <div id="img_id" value=""></div>
</table>
</div>
<div class="above" id="getcomment_window"></div>
<div>

</div>
{if $message}
<div style="color: red; text-align: center; margin-top: 40px;">{$message}</div>
{/if}



<!-- ----------------------------------------- -->
{ assign var="matches" value=$Interface->callModule('match','showmatches')}
<div style=""></div>
{if $matches.comming_match}
<table border="0" cellspacing="0" cellpadding="5" class="table">
     <tr class="table_header">
         <th colspan="4" class="fleft lright" style="color: red;" >Najbliższe dostępne spotkanie</th>
     </tr>
     <tr class="table_header">
         <th class="fleft">Dzień</th>
         <th>Godzina</th>
         <th>Miejsc</th>
         <th class="lright">Opercje</th>
     </tr>
     <tr class="table_row2">
            <td class="fleft">{$matches.comming_match.esmat_matchdate}</td>
            <td style="text-align: center;">{$matches.comming_match.esmat_matchbegintime|date_format:"%H:%M"}&nbsp;-&nbsp;{$matches.comming_match.esmat_matchendtime|date_format:"%H:%M"}</td>
            <td style="text-align: center;">{$matches.comming_match.esmat_usedslots}/{$matches.comming_match.esmat_slots}</td>
            <td class="lright">
                <a class="link" href="?module=match&action=matchdetails&id={$matches.comming_match.esmat_id}">Szczegóły</a>
            </td>
     </tr>
 </table>
{/if}
<table border="0" cellspacing="0" cellpadding="5" class="table">
    <tr class="table_header">
        <!--<td style="width: 80px;">Id</td>-->
        <th class="fleft">Dzień</th>
        <th>Godzina</th>
        <th>Miejsc</th>
        <th>Ocena spotkania</th>
        { if $smarty.session.admin.esurole_id eq 'ZAWODNIK'}<th>Twoja ocena</th>{/if}
        <th class="lright">Operacje</th>
    </tr>
	{ foreach from=$matches.matches_list.items item=match name="match"}
         <tr {if $smarty.foreach.match.iteration%2} class="table_row"{else} class="table_row3"{/if}>
            <td class="fleft">{if $match->esmat_locked eq 1}<img src="images/lock_closed.png" />{/if}{$match->esmat_matchdate}</td>
            <td style="text-align: center;">{$match->esmat_matchbegintime|date_format:"%H:%M"}&nbsp;-&nbsp;{$match->esmat_matchendtime|date_format:"%H:%M"}</td>
            <td style="text-align: center;">{$match->esmat_usedslots}/{$match->esmat_slots}</td>
            <td>
                {if $match->esmat_rate gt 0.5}
                    <div class="gallery_star2_blue"></div>
                {else}
                    <div class="gallery_star_blue"></div>
                {/if}
                {if $match->esmat_rate gt 1.5}
                    <div class="gallery_star2_blue"></div>
                {else}
                    <div class="gallery_star_blue"></div>
                {/if}
                {if $match->esmat_rate gt 2.5}
                    <div class="gallery_star2_blue"></div>
                {else}
                    <div class="gallery_star_blue"></div>
                {/if}
                {if $match->esmat_rate gt 3.5}
                    <div class="gallery_star2_blue"></div>
                {else}
                    <div class="gallery_star_blue"></div>
                {/if}
                {if $match->esmat_rate gt 4.5}
                    <div class="gallery_star2_blue"></div>
                {else}
                    <div class="gallery_star_blue"></div>
                {/if}
            </td>
            { if $smarty.session.admin.esurole_id eq 'ZAWODNIK'}
            <td>
            { if $smarty.session.admin.esurole_id eq 'ZAWODNIK' && $match->esmat_locked eq 1}
                    {if $match->esmat_yourrate eq ''}
                            <div id="{$match->esmat_id}" style="display: none;"></div>
                            <div id="{$match->esmat_id}_1" class="gallery_star" onmouseover="enable_star(id); " onmouseout="disable_star(id)" onclick="vote(id)"></div>
                            <div id="{$match->esmat_id}_2" class="gallery_star" onmouseover="enable_star(id); " onmouseout="disable_star(id)" onclick="vote(id)"></div>
                            <div id="{$match->esmat_id}_3" class="gallery_star" onmouseover="enable_star(id); " onmouseout="disable_star(id)" onclick="vote(id)"></div>
                            <div id="{$match->esmat_id}_4" class="gallery_star" onmouseover="enable_star(id); " onmouseout="disable_star(id)" onclick="vote(id)"></div>
                            <div id="{$match->esmat_id}_5" class="gallery_star" onmouseover="enable_star(id); " onmouseout="disable_star(id)" onclick="vote(id)"></div>

                                    <div id="{$match->esmat_id}1" class="gallery_star2" style="display: none;"></div>
                                    <div id="{$match->esmat_id}20" class="gallery_star" style="display: none;"></div>
                                    <div id="{$match->esmat_id}2" class="gallery_star2" style="display: none;"></div>
                                    <div id="{$match->esmat_id}30" class="gallery_star" style="display: none;"></div>
                                    <div id="{$match->esmat_id}3" class="gallery_star2" style="display: none;"></div>
                                    <div id="{$match->esmat_id}40" class="gallery_star" style="display: none;"></div>
                                    <div id="{$match->esmat_id}4" class="gallery_star2" style="display: none;"></div>
                                    <div id="{$match->esmat_id}50" class="gallery_star" style="display: none;"></div>
                                    <div id="{$match->esmat_id}5" class="gallery_star2" style="display: none;"></div>

                            {if $match->esmat_yourrate eq $match->esmat_id}
                            <div id="{$match->esmat_id}1" class="gallery_star2"></div>
                            {if $match->esmat_yourrate lt 2}
                                    <div id="{$match->esmat_id}2" class="gallery_star"></div>
                            {else}
                                    <div id="{$match->esmat_id}2" class="gallery_star2"></div>
                            {/if}
                            {if $match->esmat_yourrate lt 3}
                                    <div id="{$match->esmat_id}3" class="gallery_star"></div>
                            {else}
                                    <div id="{$match->esmat_id}3" class="gallery_star2"></div>
                            {/if}
                            {if $match->esmat_yourrate lt 4}
                                    <div id="{$match->esmat_id}4" class="gallery_star"></div>
                            {else}
                                    <div id="{$match->esmat_id}4" class="gallery_star2"></div>
                            {/if}
                            {if $match->esmat_yourrate lt 5}
                                    <div id="{$match->esmat_id}5" class="gallery_star"></div>
                            {else}
                                    <div id="{$match->esmat_id}5" class="gallery_star2"></div>
                            {/if}
                            <script type="text/javascript">
                                    document.getElementById('{$match->esmat_id}_1').className='gallery_star_unvisible';
                                    document.getElementById('{$match->esmat_id}_2').className='gallery_star_unvisible';
                                    document.getElementById('{$match->esmat_id}_3').className='gallery_star_unvisible';
                                    document.getElementById('{$match->esmat_id}_4').className='gallery_star_unvisible';
                                    document.getElementById('{$match->esmat_id}_5').className='gallery_star_unvisible';
                            </script>
                            {/if}
                    {else}
                             {if $match->esmat_yourrate gt 0.5}
                                <div style="cursor: default;" class="gallery_star2"></div>
                            {else}
                                <div style="cursor: default;" class="gallery_star"></div>
                            {/if}
                            {if $match->esmat_yourrate gt 1.5}
                                <div style="cursor: default;" class="gallery_star2"></div>
                            {else}
                                <div style="cursor: default;" class="gallery_star"></div>
                            {/if}
                            {if $match->esmat_yourrate gt 2.5}
                                <div style="cursor: default;" class="gallery_star2"></div>
                            {else}
                                <div style="cursor: default;" class="gallery_star"></div>
                            {/if}
                            {if $match->esmat_yourrate gt 3.5}
                                <div style="cursor: default;" class="gallery_star2"></div>
                            {else}
                                <div style="cursor: default;" class="gallery_star"></div>
                            {/if}
                            {if $match->esmat_yourrate gt 4.5}
                                <div style="cursor: default;" class="gallery_star2"></div>
                            {else}
                                <div style="cursor: default;" class="gallery_star"></div>
                            {/if}
                    {/if}
                     {else}
                     <div style="font-size: 10px">Niedostępna</div>
                {/if}
            </td>
            {/if}
            <td class="lright">
                <a class="link" href="?module=match&action=matchdetails&id={$match->esmat_id}">Szczegóły</a>
						{if $match->esmat_comment neq null}<img class="info" src="/images/koperta.png" />{/if}

                                        <!--{literal}| <div id="{$match->esmat_id}" style="color: rgb(0, 113, 206); cursor: pointer; display: inline;"  onclick="alert('Zaloguj się najpierw aby skomentować to spotkanie.')"><strong>Dodaj komentarz</strong></div>
                {if $match->esmat_commentsnumber neq 0 }&nbsp;| <div id="commentslist_{$match->esmat_id}" style="color: rgb(0, 113, 206); cursor: pointer; display: inline;"  onclick="getComments(id)"><strong>Komentarze[{$match->esmat_commentsnumber}]</strong></div>{/if}
                                        {/literal}-->
            </td>
         </tr>
	{ /foreach }
    <tr>
</table>
<table>
    <tr><td colspan="13" style="padding-left: 40px;">
                <div id="pages">
                        { if $matches.prevfrom != FALSE }
                        <a class="prevnext" href="?module=match&amp;action=showmatches2&amp;from={$matches.prevfrom-1}"><< poprzednia </a> |
                        { /if }
                        { foreach from=$matches.page key=key item=page name=page}
                        <a {if $page.active == TRUE } class="activepagetrue"  { else } class="activepagefalse" {/if}href="?module=match&amp;action=showmatches2&amp;from={$page.from-1}">{ $page.iter }</a> |
                        { /foreach }
                        { if $matches.nextfrom != FALSE }
                        <a class="prevnext" href="?module=match&amp;action=showmatches2&amp;from={$matches.nextfrom-1}"> następna >> </a>
                        { /if }
                </div>
       </td></tr>
</table>
{ include file=$smarty.const.ADMIN_FOOTER }
