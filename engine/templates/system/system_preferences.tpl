{ $Interface->callModule('menu','showAdminMenu') }
<fieldset>
    <legend>Ustawienia</legend>
	<table cellpadding="5" cellspacing="0" border="0" class="a_main">
            <form action="?module=system&amp;action=savepref" name="edit_pref" method="post">
        <tr>
            <td>
                Tytuł strony</td><td><input class="a_inputtext" type="text" style="width: 500px;" name="field1" value="{$escore.field1}{$escore.if_error.field1}" />
                                <div class="help" onmouseover="$(this).next().show();" onmouseout="$(this).next().hide();" >?</div>
                    <div class="help_info">Wpisz tytuł strony, który wyświetli się w nagłówku karty twojej przeglądarki.</div>
            </td>
        </tr>
        <tr><td>Opis strony</td><td>
                <input class="a_inputtext" type="text" style="width: 500px;" name="field2" value="{$escore.field2}{$escore.if_error.field2}" />
                                    <div class="help" onmouseover="$(this).next().show();" onmouseout="$(this).next().hide();" >?</div>
                    <div class="help_info">Opisz w kilku zdaniach swoją stronę.</div>
        </td></tr>
        <tr><td>
                Blokada zapisu przed meczem (w godzinach)</td><td><input class="a_inputtext" type="text" maxlength="3" style="width: 50px;" name="field3" value="{$escore.field3}{$escore.if_error.field3}" /><span class="settings_error_message">{$escore.messages.3}</span>
                     <div class="help" onmouseover="$(this).next().show();" onmouseout="$(this).next().hide();" >?</div>
                     <div class="help_info">Określ na ile godzin przed rozpoczęciem spotkania ma być zablokowana możliwość zapisania się.</div>
        </td></tr>
        <tr><td>
                Blokada wypisu przed meczem (w godzinach)</td><td><input class="a_inputtext" type="text" maxlength="3" style="width: 50px;" name="field4" value="{$escore.field4}{$escore.if_error.field4}" /><span class="settings_error_message">{$escore.messages.4}</span>
                     <div class="help" onmouseover="$(this).next().show();" onmouseout="$(this).next().hide();" >?</div>
                     <div class="help_info">Określ na ile godzin przed rozpoczęciem spotkania ma być zablokowana możliwość wypisania się.</div>
        </td></tr>
        <tr><td>Adres mailowy nadawcy</td><td><input class="a_inputtext" type="text" style="width: 200px;" name="field5" value="{$escore.field5}{$escore.if_error.field5}" /><span class="settings_error_message">{$escore.messages.5}</span>
                     <div class="help" onmouseover="$(this).next().show();" onmouseout="$(this).next().hide();" >?</div>
                     <div class="help_info">Podaj adres mailowy z którego będą wysyłane wiadomości do zawodników.</div>
            </td></tr>
        <tr style="text-align: center">
            <td colspan="2"><input id="submit_match" type="image" src="images/submit_button.jpg" /></td>
        </tr>
	</form>
        </table>
</fieldset>

{ include file=$smarty.const.ADMIN_FOOTER }