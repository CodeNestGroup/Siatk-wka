{ $Interface->callModule('menu','showAdminMenu') }
<div style="margin-top: 40px" ></div>
<table cellspacing="0" cellpadding="5" class="table">
    <tr class="table_header">
        <th colspan="2">Szczegóły spotkania</th>		
    </tr>  
    <tr class="table_row">
        <td style="width: 150px;" class="fleft">Data spotkania:</td>
        <td class="lright">{$escore.match.esmat_matchdate}</td>
    </tr>
    <tr class="table_row">
        <td style="width: 150px;" class="fleft">Godzina:</td>
        <td class="lright">{$escore.match.esmat_matchbegintime|date_format:"%H:%M"} - {$escore.match.esmat_matchendtime|date_format:"%H:%M"}</td>
    </tr>
    <tr class="table_row">
        <td style="width: 150px;" class="fleft">Liczba miejsc:</td>
        <td class="lright">{$escore.signedUpPlayersCounter}/{$escore.match.esmat_slots}</td>
    </tr>
    {if $escore.userrole eq 'ZAWODNIK' && $escore.match.esmat_fulllocked eq 0}
    <tr class="table_row">
        <td style="width: 150px;" class="fleft">Zapisy:</td>
        <td class="lright">
            {if $escore.issignedup eq 0}
            {if $escore.match.esmat_fulllocked eq 0}
                <a class="glink" href="?module=match&action=signin&id={$escore.match.esmat_id}&login={$smarty.session.admin.essysus_login}">
                        Kliknij aby się zapisać
                </a>
            {/if}
            {else}
            {if $escore.match.esmat_locked eq 0}
                <a class="rlink" href="?module=match&action=signout&id={$escore.match.esmat_id}&login={$smarty.session.admin.essysus_login}" onclick="return confirm('Potwierdź wypisanie się klikając OK. Jeżeli zapiszesz się ponownie zostaniesz umieszcony na końcu listy!')">
                    Kliknij aby się wypisać
                </a>
            {else}
                Nie można się już wypisać!
            {/if}
            {/if}</td>
    </tr>
    {/if}
	{if $escore.userrole lte 'ZAWODNIK'}
	<tr class="table_row">
		<td class="fleft lright" colspan="2">
			<form action="?module=match&action=addcomment" method="post">
				<input type="hidden" name="id_match" value="{$escore.match.esmat_id}"/>
				Napisz wiadomość: <input type="text" name="comment" value=""/>
				<input type="submit" name="addcomment" value="Wyślij"/>
			</form>	
		</td>	
	</tr>
	{/if}
    {if $escore.match.esmat_comment}
    <tr class="table_row">
        <td  class="fleft lright" colspan="2" >{$escore.match.esmat_comment}</td>
    </tr>
    {/if}
    <tr class="table_row">
        <td  style="color: red;" class="fleft lright" colspan="2" ><strong style="color: red;">Uwaga!</strong> Możliwość wypisania jest blokowana na 2 godziny przed rozpoczęciem spotkania. Zapisać się można do ostatniej minuty przed meczem.</td>
    </tr>
    <tr class="table_row">
        <td style="color: red;"  class="fleft lright" colspan="2">
            Jeżeli zawodnik, który jest zapisany na mecz nie wypisze się z meczu, a nie przyjdzie na mecz, musi uiścić opłatę 10zł ( normalnie jakby był).
        </td>
    </tr>
    <tr class="table_row">
        <td style="color: red;"  class="fleft lright" colspan="2">
            Jest bowiem blokowane miejsce dla tego zawodnika.
        </td>
    </tr>
    {if $escore.match.esmat_locked eq 1}
    <tr class="table_row">
        <td style="width: 150px;" class="fleft">
            Administracja:
        </td>
        <td class="lright">
            <a class="link" href="?module=match&action=addMatchResults&id={$escore.match.esmat_id}">Wyniki meczu</a>
        </td>
    </tr>
    {/if}
</table>
{if $escore.players }
<table cellspacing="0" cellpadding="5" class="table">
    <tr class="table_header">
        <th colspan="3">{ if $escore.match.esmat_locked}Uczestnicy spotkania{else}Zawodnicy zapisani na mecz {/if}</th>
    </tr>    
    {foreach from=$escore.players item=p name="p"}
       {if $smarty.foreach.p.iteration gt $escore.match.esmat_slots}
        <tr class="table_row">
            <td class="fleft d_firstcell">{$smarty.foreach.p.iteration}.</td>
            <td class="d_secondcell">{$p->essysus_login}</td>
            <td class="lright">{ if $smarty.session.admin.esurole_id eq 'ADMINISTRATOR' && $escore.match.esmat_locked eq 0}<a class="rlink" href="?module=match&action=signout&id={$escore.match.esmat_id}&login={$p->essysus_login}">Wypisz</a>{/if}</td>
        </tr>
       {else}
        <tr class="table_row">
            <td class="fleft d_firstcell">{$smarty.foreach.p.iteration}.</td>
            <td class="d_secondcell"><strong>{$p->essysus_login}</strong></td>
            <td class="lright">{ if $smarty.session.admin.esurole_id eq 'ADMINISTRATOR' && $escore.match.esmat_locked eq 0}<a class="rlink" href="?module=match&action=signout&id={$escore.match.esmat_id}&login={$p->essysus_login}">Wypisz</a>{/if}{if $escore.match.esmat_locked eq 1}{if $p->esmus_matchresult eq 'loser'}<img style="width: 18px; float: left;" src="images/emoticon_unhappy.png" />{/if}{if $p->esmus_matchresult eq 'winner'}<img style="width: 18px;" src="images/emoticon_smile.png" />{/if}{/if}</td>
        </tr>
        {/if}
          {if $smarty.foreach.p.iteration eq $escore.match.esmat_slots}
        <tr class="table_header">
            <th colspan="3">Zawodnicy rezerwowi</th>
        </tr>
       {/if}
    {/foreach}
</table>
{/if}
{if !$escore.match.esmat_fulllocked}
{if $escore.notSignedUpPlayers}
<table cellspacing="0" cellpadding="5" class="table">
    <tr class="table_header">
        <th colspan="3">Zawodnicy niezapisani na mecz</th>
    </tr>
    {foreach from=$escore.notSignedUpPlayers item=nsp name="nsp"}
        <tr class="table_row">
            <td class="fleft d_firstcell">{$smarty.foreach.nsp.iteration}.</td>
            <td class="d_secondcell">{$nsp->essysus_login}</td>
            <td class="lright">{ if $smarty.session.admin.esurole_id eq 'ADMINISTRATOR' && $escore.match.esmat_fulllocked eq 0}<a class="glink" href="?module=match&action=signin&id={$escore.match.esmat_id}&login={$nsp->essysus_login}">Zapisz</a>{/if}</td>
        </tr>
    {/foreach}
</table>
{/if}
{/if}
{ include file=$smarty.const.ADMIN_FOOTER }
