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


<!-- przełacznik shop/content tutaj był -->
<div>

</div>
{if $message}
<div style="margin-left: 40px; color: red; text-align: center; margin-top: 40px;">{$message}</div>
{/if}
<div style="margin-left: 50px; font-size: 14px; margin-top: 20px; width: 954px; text-align: center; " class="link"><span style="cursor: pointer;" onclick="history.back()">Powrót do meczy</span></div>
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
    {if $escore.userrole eq 'ZAWODNIK' && $escore.match.esmat_locked eq 0}
    <tr class="table_row">
        <td style="width: 150px;" class="fleft">Zapisy:</td>
        <td class="lright">
            {if $escore.issignedup eq 0}
                <a class="glink" href="?module=match&action=signin&id={$escore.match.esmat_id}&login={$smarty.session.admin.essysus_login}">
                        Kliknij aby się zapisać
                </a>
            {else}
                <a class="rlink" href="?module=match&action=signout&id={$escore.match.esmat_id}&login={$smarty.session.admin.essysus_login}" onclick="return confirm('Potwierdź wypisanie się klikając OK. Jeżeli zapiszesz się ponownie zostaniesz umieszcony na końcu listy!')">
                    Kliknij aby się wypisać
                </a>
            {/if}</td>
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
    </td
</table>

<table cellspacing="0" cellpadding="5" class="table">
    <tr class="table_header">
        <th colspan="3">{ if $escore.match.esmat_locked}Uczestnicy spotkania{else}Zawodnicy zapisani na mecz {/if}</th>
    </tr>    
    {foreach from=$escore.players item=p name="p"}
       {if $smarty.foreach.p.iteration gt $escore.match.esmat_slots}
        <tr class="table_row">
            <td class="fleft d_firstcell">{$smarty.foreach.p.iteration}.</td>
            <td class="d_secondcell">{$p->essysus_login}</strong></td>
            <td class="lright">{if $escore.match.esmat_locked eq 0}<a class="rlink" href="?module=match&action=signout&id={$escore.match.esmat_id}&login={$p->essysus_login}">Wypisz</a>{/if}</td>
        </tr>
       {else}
        <tr class="table_row">
            <td class="fleft d_firstcell">{$smarty.foreach.p.iteration}.</td>
            <td class="d_secondcell"><strong>{$p->essysus_login}</strong></td>
            <td class="lright">{if $escore.match.esmat_locked eq 0}<a class="rlink" href="?module=users&action=adminmode&id={$escore.match.esmat_id}&login={$p->essysus_login}&type=signout">Wypisz</a>{/if}</td>
        </tr>
        {/if}
          {if $smarty.foreach.p.iteration eq $escore.match.esmat_slots}
        <tr class="table_header">
            <th colspan="3">Zawodnicy rezerwowi</th>
        </tr>
       {/if}
    {/foreach}
</table>

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
            <td class="lright">{if $escore.match.esmat_fulllocked eq 0}<a class="glink" href="?module=users&action=adminmode&id={$escore.match.esmat_id}&login={$nsp->essysus_login}&type=signin">Zapisz</a>{/if}</td>
        </tr>
    {/foreach}
</table>
{/if}
{/if}
{ include file=$smarty.const.ADMIN_FOOTER }
