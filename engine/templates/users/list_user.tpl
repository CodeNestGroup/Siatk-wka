{ $Interface->callModule('menu','showAdminMenu') }
<div style="margin-top: 40px"></div>
	<table class="table" border="0" cellspacing="0" cellpadding="5">
		<tr class="table_header">
			<th>Login</th>
			<th>E-mail</th>
			<th>Ostatnie logowanie</th>
			<th>Logowań</th>
			<th>Aktywny</th>
			<th>Operacje</th>
		</tr>
	{ foreach from=$escore.users_list item=user name=user}
		<tr class="table_row" onmouseover="javascript: this.style.backgroundColor='{$smarty.const.TR_ONMOUSEOVER_COLOR}'" onmouseout="javascript: this.style.backgroundColor='#F1F1F1'">
			<td {if $Interface->getCurrentUser()==$user->essysus_login } id="a_if_currentlogged" { /if }>{ $user->essysus_login }</td>
			<td>{ $user->essysus_email }</td>
			<td style="text-align:center">{ if !$user->convertToDate(essysus_lastlogin,'public') } brak logowań { else } { $user->convertToDate(essysus_lastlogin,'public')} { /if}</td>
			<td style="text-align:center">{ $user->essysus_counter }</td>
			<td style="font-size: 10px;text-align: center;">{ if !$user->essysus_active }<a style="color: #FF0000;text-decoration: none" href="{if $Interface->getCurrentUser()==$user->essysus_login }javascript: alert('Nie można zmieniać aktywności aktualnie zalogowanego użytkownika!');{else}?module=users&amp;action=change_user_active&amp;login={$user->essysus_login}{/if}">NIE</a>{ else }<a style="color: #00FF00;text-decoration: none" href="{if $Interface->getCurrentUser()==$user->essysus_login }javascript: alert('Nie można zmieniać aktywności aktualnie zalogowanego użytkownika!');{else}?module=users&amp;action=change_user_active&amp;login={$user->essysus_login}{/if}">TAK</a>{ /if}</td>			
			<td class="a_action">{ if $Interface->getCurrentUserRole()=='ADMINISTRATOR' } <a class="a_edit" href="?module=users&amp;action=edituser_form&amp;login={$user->essysus_login}">edytuj</a> | <a onclick="return confirm('Czy napewno usunąć użytkownika: {$user->essysus_login} ?')" class="a_delete" href="?module=users&amp;action=deluser&amp;login={$user->essysus_login}">usuń</a> |{ /if } <a class="a_changepass" href="?module=users&amp;action=changepass_form&amp;login={$user->essysus_login}">zmiana hasła</a></td>
		</tr>
	{ /foreach }
	</table>
{ include file=$smarty.const.ADMIN_FOOTER }