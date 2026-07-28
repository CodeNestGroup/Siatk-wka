{ $Interface->callModule('menu','showAdminMenu') }
<div style="margin-top: 40px"></div>
    <fieldset>
        <legend>Edycja zawodnika</legend>
	<form action="?module=users&amp;action=updateuser" method="post">
	<div><input type="hidden" name="essysus_login" value="{ $escore.users_list->essysus_login }" /></div>
	<div><input type="hidden" name="esurole_id" value="{ $escore.users_list->esurole_id }" /></div>
	<table cellpadding="5" cellspacing="0" border="0">
		<tr><td>Login: </td><td>{ $escore.users_list->essysus_login }</td></tr>
		<tr><td>Rola:<span style="color: #FF0000">*</span> </td><td>
			<select class="a_select" name="esurole_id" { if $Interface->getCurrentUser() == $escore.users_list->essysus_login } disabled="disabled" { /if }>
			<option value="">Wybierz rolę</option>	
		{ foreach from=$escore.role_list item=role }
			{ if $role->esurole_id == $escore.users_list->esurole_id }				
				<option value="{$role->esurole_id}" selected="selected">{ $role->esurole_name }</option>
			{ else }
				<option value="{$role->esurole_id}">{ $role->esurole_name }</option>
			{ /if }
		{ /foreach }
		</select></td></tr>	
		<tr><td>E-mail:<span style="color: #FF0000">*</span> </td><td><input class="a_inputtext" type="text" name="essysus_email" value="{$escore.users_list->essysus_email}" /></td></tr>
		<tr><td>Opis: </td><td><textarea class="a_inputtextarea" rows="4" cols="43" name="essysus_desc">{ $escore.users_list->gethtml(essysus_desc) }</textarea></td></tr>				
		<tr><td>Aktywny:</td><td>
			{ if $escore.users_list->essysus_active != '1' && $escore.users_list->essysus_active!='on'}
				<input style="vertical-align: middle" type="checkbox" name="essysus_active" {if $Interface->getCurrentUser()==$escore.users_list->essysus_login }onclick="javascript: alert('Nie można zmieniać aktywności aktualnie zalogowanego użytkownika!'); return false;"{/if} /> 
			{ else }
				<input style="vertical-align: middle" type="checkbox" name="essysus_active" checked="checked" {if $Interface->getCurrentUser()==$escore.users_list->essysus_login }onclick="javascript: alert('Nie można zmieniać aktywności aktualnie zalogowanego użytkownika!'); return false;"{/if} /> 
			{ /if }
                    </td>
                </tr>
                <tr><td></td><td><span style="color: #FF0000">*</span> - pozycje wymagane</td></tr>
                <tr style="text-align: center"><td colspan="2"><input id="submit" type="image" src="images/submit_button.jpg" /></td></tr>
        </table>
     </fieldset>
</form>
{ include file=$smarty.const.ADMIN_FOOTER }