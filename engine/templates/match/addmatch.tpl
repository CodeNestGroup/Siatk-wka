{ $Interface->callModule('menu','showAdminMenu') }
<script type="text/javascript" src="js/jquery.livequery.js"></script>
<form action="?module=match&amp;action=addmatchform" method="post">
    <fieldset>
        <legend>Zaplnauj nowy mecz</legend>
        <table cellpadding="5" cellspacing="0" border="0">
            <tr>
                <td style="width: 120px;">
                    Dzień:
                </td>
                <td>
                    <select id="date_day" class="select" name="date_day">
                        {section name=date_day loop=31}
                        <option>{$smarty.section.date_day.iteration}</option>
                        {/section}
                    </select>
                    /
                    <select id="date_month" class="select" name="date_month">
                        {section name=date_month loop=12}
                        <option>{$smarty.section.date_month.iteration}</option>
                        {/section}
                    </select>
                    /
                    <select id="date_year" class="select" name="date_year">
                        <option>{$escore.year.current}</option>
                        <option>{$escore.year.next}</option>
                    </select>
                    <span style="display: none; color: red;" id="date_error">Data jest nieprawidłowa</span>
                </td>
            </tr>
            <tr>
                <td>
                    Godzina:
                </td>
                <td>
                    Początek:
                    <select name="start_h">
                        <option>00</option>
                        {section name=start_h loop=23}
                        <option>{if $smarty.section.start_h.iteration lt 10}0{/if}{$smarty.section.start_h.iteration}</option>
                        {/section}
                    </select>
                    :
                    <select name="start_m">
                        <option>00</option>
                        {section name=start_m loop=59}
                        <option>{if $smarty.section.start_m.iteration lt 10}0{/if}{$smarty.section.start_m.iteration}</option>
                        {/section}
                    </select>
                    Koniec:
                    <select name="end_h">
                        <option>00</option>
                        {section name=end_h loop=23}
                        <option>{if $smarty.section.end_h.iteration lt 10}0{/if}{$smarty.section.end_h.iteration}</option>
                        {/section}
                    </select>
                    :
                    <select name="end_m">
                        <option>00</option>
                        {section name=end_m loop=59}
                        <option>{if $smarty.section.end_m.iteration lt 10}0{/if}{$smarty.section.end_m.iteration}</option>
                        {/section}
                    </select>
                </td>
            </tr>
            <tr>
                <td>Liczba miejsc:</td>
                <td>
                    <select name="slots">
                        {section name=slots loop=99}
                        <option {if $smarty.section.slots.iteration eq 12} selected="selected" {/if}>{$smarty.section.slots.iteration}</option>
                        {/section}
                    </select>
                    <div class="help" onmouseover="$(this).next().show();" onmouseout="$(this).next().hide();" >?</div>
                    <div class="help_info">Ilość osób, która może zostać zapisana na mecz.</div>
                </td>
            </tr>
            <tr>
                <td>Komentarz:</td>
                <td><textarea name="comment" cols="25" rows="5"></textarea>
                </td>
            </tr>
            <tr>
                <td>Powtórz mecz:
                </td>
                <td>
                    <select name="cycles">
                    <option>0</option>
                    {section name=cycles loop=12}
                        <option>{$smarty.section.cycles.iteration}</option>
                    {/section}
                    </select>
                    <div class="help" onmouseover="$(this).next().show();" onmouseout="$(this).next().hide();" >?</div>
                    <div class="help_info">Wybranie tej opcji spowoduje dodanie tego meczu w kolejnych tygodniach.<br /> Każdy kolejny mecz zostanie dodany z tygodniowym przesunięciem.<br />Jeżeli chcesz dodać tylko aktualny mecz wybierz 0.</div>
                </td>
            </tr>
        </table>
        <div style="margin-left: 5px; color: red;">Aby zapisać zawodnika na mecz kliknij dwukrotnie zawodnika (kolejność ma znaczenie). </div>
        <table style="width: 984px;" cellpadding="5">
            <tr>
                <th>Dostępni zawodnicy</th>
                <th>Zawodnicy zapisani</th>
            </tr>
            <tr>
                <td>
                    <select id="users" Multiple size=15 style="width: 100%" title="Kliknij dwukrotnie na zawodniku aby zapisać.">
                    {foreach from=$escore.users name="user" item=user}
                        <option val="{$user->essysus_login}">{$user->essysus_login}</option>
                    {/foreach}
                    </select>
                </td>
                <td>
                    <select name="signedup_users[]" id="signedup_users" Multiple size=15 style="width: 100%;" title="Kliknij dwukrotnie na zawodniku aby wypisać."></select>
                </td>
            </tr>
            <tr style="text-align: center">
                <td colspan="2"><input id="submit_match" type="image" src="images/submit_button.jpg" /></td>
            </tr>
        </table>
    </fieldset>
</form>
{ include file=$smarty.const.ADMIN_FOOTER }