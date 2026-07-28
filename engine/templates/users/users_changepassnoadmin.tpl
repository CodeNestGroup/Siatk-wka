{ $Interface->callModule('menu','showAdminMenu') }
<div style="margin-top: 40px"></div>
    <fieldset>
        <legend>Zmiana hasła</legend>
        <form action="?module=users&amp;action=changepassnoadmin" method="post">
        <div><input type="hidden" name="essysus_login" value="{ if $Interface->doesSmartyArrayExist($escore.if_error) } {$escore.if_error.essysus_login} {else} {$escore.essysus_login }{/if}" /></div>
        <table cellpadding="5" cellspacing="0" border="0">
                        <tr style="width: 120px;"><td>Login użytkownika:</td><td>{ if $Interface->doesSmartyArrayExist($escore.if_error)} { $escore.if_error.essysus_login }  { else } { $escore.essysus_login } { /if }</td></tr>
                        <tr><td>Nowe hasło:</td><td><input class="a_inputtext" type="password" name="users_newpass" value="" /></td></tr>
                        <tr><td>Powtórz nowe hasło:</td><td><input class="a_inputtext" type="password" name="users_newpass_repeat" value="" /></td></tr>
                        <tr style="text-align: center"><td colspan="2"><input id="submit" type="image" src="images/submit_button.jpg" /></td></tr>
        </table>
        </form>
    </fieldset>
{ include file=$smarty.const.ADMIN_FOOTER }
