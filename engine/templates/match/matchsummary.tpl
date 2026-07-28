{ $Interface->callModule('menu','showAdminMenu') }
<script type="text/javascript" src="js/jquery.livequery.js"></script>
<form action="?module=match&amp;action=addmatchresultsform" method="post">
    <fieldset>
        <legend>Wyniki meczu z dnia: {$escore.match.esmat_matchdate}</legend>
        <table style="width: 984px;" cellpadding="5">
            <tr>
                <th>Zespół A</th>
                <th>Zespół B</th>
            </tr>
            <tr>
                <td>
                    <select name="team1[]" id="team1" Multiple size=15 style="width: 100%" title="Kliknij dwukrotnie, aby przenieść do drużyny przeciwnej.">
                    {if $escore.match_summary eq ''}
                        {foreach from=$escore.users name="user" item=user}
                            <option val="{$user->essysus_login}">{$user->essysus_login} </option>
                        {/foreach}
                    {else}
                        {foreach from=$escore.match_summary name="user" item=user}
                            {if $user->esmt_team eq '0'}
                            <option val="{$user->essysus_login}">{$user->essysus_login}</option>
                            {/if}
                        {/foreach}
                    {/if}
                    </select>
                </td>
                <td>
                    <select name="team2[]" id="team2" Multiple size=15 style="width: 100%;" title="Kliknij dwukrotnie, aby przenieść do drużyny przeciwnej.">
                    {if $escore.match_summary neq ''}
                        {foreach from=$escore.match_summary name="user" item=user}
                            {if $user->esmt_team eq '1'}
                            <option val="{$user->essysus_login}">{$user->essysus_login}</option>
                            {/if}
                        {/foreach}
                    {/if}
                    </select>
                </td>
            </tr>
            <tr>
                <td>Wygranych setów: <input style="width: 20px" id="wonsets_A" name="wonsets_A" type="text" maxlength="1" value="{if $escore.match.esmat_team1points eq ''}0{else}{$escore.match.esmat_team1points}{/if}"/>
                    
                </td>
                <td>Wygranych setów: <input style="width: 20px" id="wonsets_B" name="wonsets_B" type="text" maxlength="1" value="{if $escore.match.esmat_team2points eq ''}0{else}{$escore.match.esmat_team2points}{/if}" /></td>
            </tr>
            <tr>
                <td colspan="2"><span id="player_delete" style="color: red; cursor: pointer; padding-top: 2px;">Usuń zawodników</span>
                    <div class="help" onmouseover="$(this).next().show();" onmouseout="$(this).next().hide();" >?</div>
                    <div class="help_info">Usuwa ze statystyk meczu zawdoników zaznaczonych w obu kolumnach. <br />Aby zaznaczyć kilku zawdoników jednocześnie przytrzymaj shift.</div>
                </td>
            </tr>
            <tr style="text-align: center">
                <td colspan="2">
                    <input type="hidden" name="esmat_id" value="{$escore.match.esmat_id}" />
                    <input id="submit_matchsummary" type="image" src="images/submit_button.jpg" />
                </td>
            </tr>
        </table>
    </fieldset>
</form>
{ include file=$smarty.const.ADMIN_FOOTER }