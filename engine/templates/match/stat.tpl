{ $Interface->callModule('menu','showAdminMenu') }
<div style="margin-top: 40px"></div>
<table border="0" cellspacing="0" cellpadding="5" class="table">
    <tr class="table_header">
        <th class="fleft">Zawodnik</th>
        <th>Wygrane</th>
        <th>Przegrane</th>
        <th>Rozegranych meczy</th>
        <th class="lright">Skuteczność</th>
    </tr>
	{ foreach from=$escore.stat item=s name="s"}
         <tr class="table_row">
            <td class="fleft">{$s->essysus_login}</td>
            <td style="text-align: center;">{$s->won}</td>
            <td style="text-align: center;">{$s->lose}</td>
            <td style="text-align: center;">{$s->total}</td>
            <td style="text-align: center;" class="lright">{$s->percentage}%</td>
         </tr>
	{ /foreach }
    <tr>
</table>
{ include file=$smarty.const.ADMIN_FOOTER }