{ $Interface->callModule('menu','showAdminMenu') }
<div style="margin-top: 40px"></div>
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
					<textarea style="width: 335px;" id="escom_desc" style="float: left;" cols="39" rows="6" wrap="OFF" maxlength="250"></textarea>
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
{if $escore.comming_match}
<table border="0" cellspacing="0" cellpadding="5" class="table">
     <tr class="table_header">
         <th colspan="4" class="fleft lright" style="color: red">Najbliższe dostępne spotkanie</th>
     </tr>
     <tr class="table_header">
         <th class="fleft">Dzień</th>
         <th>Godzina</th>
         <th>Miejsc</th>
         <th class="lright">Opercje</th>
     </tr>
     <tr class="table_row2">
            <td class="fleft">{$escore.comming_match.esmat_matchdate}</td>
            <td style="text-align: center;">{$escore.comming_match.esmat_matchbegintime|date_format:"%H:%M"}&nbsp;-&nbsp;{$escore.comming_match.esmat_matchendtime|date_format:"%H:%M"}</td>
            <td style="text-align: center;">{$escore.comming_match.esmat_usedslots}/{$escore.comming_match.esmat_slots}</td>
            <td class="lright">
                <a class="link" href="?module=match&action=matchdetails&id={$escore.comming_match.esmat_id}">Szczegóły</a>

                { if $smarty.session.admin.esurole_id eq 'ZAWODNIK' && $escore.comming_match.esmat_locked eq 0}
                {if $escore.comming_match.esmat_matchstatus gt 0}| <a class="rlink" href="?module=match&action=signout&id={$escore.comming_match.esmat_id}&login={$smarty.session.admin.essysus_login}" onclick="return confirm('Potwierdź wypisanie się klikając OK. Jeżeli zapiszesz się ponownie zostaniesz umieszcony na końcu listy!')">Wypisz się</a>{/if}
                {/if}
                { if $smarty.session.admin.esurole_id eq 'ZAWODNIK' && $escore.comming_match.esmat_fulllocked eq 0}
                {if $escore.comming_match.esmat_matchstatus eq 0}| <a class="glink" href="?module=match&action=signin&id={$escore.comming_match.esmat_id}&login={$smarty.session.admin.essysus_login}">Zapisz się</a>{/if}
                {/if}
            </td>
     </tr>
 </table>
{/if}
<table border="0" cellspacing="0" cellpadding="5" class="table">
    <tr class="table_header">
        <th class="fleft">Dzień</th>
        <th>Godzina</th>
        <th>Miejsc</th>
        <th>Ocena spotkania</th>
        { if $smarty.session.admin.esurole_id eq 'ZAWODNIK'}<th>Twoja ocena</th>{/if}
        <th class="lright komunikaty">Operacje</th>
    </tr>
	{ foreach from=$escore.matches_list.items item=match name="match"}
         <tr {if $smarty.foreach.match.iteration%2} class="table_row"{else} class="table_row3"{/if} >
            <td class="fleft">{if $match->esmat_locked eq 1}<img src="images/lock_closed.png" />{/if}{$match->esmat_matchdate}</td>
            <td style="text-align: center;">{$match->esmat_matchbegintime|date_format:"%H:%M"}&nbsp;-&nbsp;{$match->esmat_matchendtime|date_format:"%H:%M"}</td>
            <td style="text-align: center;">{$match->esmat_usedslots}/{$match->esmat_slots}</td>
            <td class="td_star">
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
            <td class="td_star">
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
                { if $smarty.session.admin.esurole_id eq 'ZAWODNIK' && $match->esmat_locked eq 0}
                {if $match->esmat_matchstatus gt 0}| <a class="rlink" href="?module=match&action=signout&id={$match->esmat_id}&login={$smarty.session.admin.essysus_login}" onclick="return confirm('Potwierdź wypisanie się klikając OK. Jeżeli zapiszesz się ponownie zostaniesz umieszcony na końcu listy!')">Wypisz się</a>{/if}
                {/if}
                { if $smarty.session.admin.esurole_id eq 'ZAWODNIK' && $match->esmat_fulllocked eq 0}
                {if $match->esmat_matchstatus eq 0}| <a class="glink" href="?module=match&action=signin&id={$match->esmat_id}&login={$smarty.session.admin.essysus_login}">Zapisz się</a>{/if}
                {/if}
                { if $smarty.session.admin.esurole_id eq 'ADMINISTRATOR'}
                | <a class="rlink" onclick="return confirm('Czy chcesz usunąć wybrany mecz? Spowoduje to również usunięcie statystyk tego meczu.')" href="?module=match&action=deletematch&id={$match->esmat_id}">Usuń</a>
                {/if}
                <!--{literal}| <div id="{$match->esmat_id}" style="color: rgb(0, 113, 206); cursor: pointer; display: inline;"  onclick="addComment_visible(id)"><strong>Dodaj komentarz</strong></div>
                {if $match->esmat_commentsnumber neq 0 }&nbsp;| <div id="commentslist_{$match->esmat_id}" style="color: rgb(0, 113, 206); cursor: pointer; display: inline;"  onclick="getComments(id)"><strong>Komentarze[{$match->esmat_commentsnumber}]</strong></div>{/if}
                {/literal}-->
				{if $match->esmat_comment neq null}<img class="info" src="/images/koperta.png" />{/if}
            </td>
         </tr>
	{ /foreach }
</table>
<table>
    <tr><td colspan="13" style="padding-left: 40px;">
                <div id="pages">
                        { if $escore.prevfrom != FALSE }
                        <a class="prevnext" href="?{ $Interface->getQueryStringToPage() }&amp;from={$escore.prevfrom-1}"><< poprzednia </a> |
                        { /if }
                        { foreach from=$escore.page key=key item=page name=page}
                        <a {if $page.active == TRUE } class="activepagetrue"  { else } class="activepagefalse" {/if}href="?{ $Interface->getQueryStringToPage() }&amp;from={$page.from-1}">{ $page.iter }</a> |
                        { /foreach }
                        { if $escore.nextfrom != FALSE }
                        <a class="prevnext" href="?{ $Interface->getQueryStringToPage() }&amp;from={$escore.nextfrom-1}"> następna >> </a>
                        { /if }
                </div>
                        { if $escore.articles_list.num_rows>$smarty.const.ADMIN_ART_STEP }
                        <div style="font-size: 10px; margin-top: 5px; padding-bottom: 10px;">
                        Wyświetlono { $Interface->getGETVariable('from')+1 } do { if $Interface->getGETVariable('from')+$smarty.const.ADMIN_ART_STEP < $escore.articles_list.num_rows}{ $Interface->getGETVariable('from')+$smarty.const.ADMIN_ART_STEP }{ else }{ $escore.articles_list.num_rows }{ /if} wyników z { $escore.articles_list.num_rows } znalezionych.
                        </div>
                        { /if }
       </td></tr>
</table>
{ include file=$smarty.const.ADMIN_FOOTER }
