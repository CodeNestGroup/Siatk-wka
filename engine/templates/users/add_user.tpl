{ $Interface->callModule('menu','showAdminMenu') }
<div style="margin-top: 40px"></div>
<form action="?module=users&amp;action=adduser" method="post">
        <fieldset>
        <legend>Dodaj nowego zawodnika</legend>
	<table cellpadding="5" cellspacing="0" border="0">
		<tr><td style="width: 120px">Login:<span style="color: #FF0000">*</span> </td><td><input class="a_inputtext" type="text" name="essysus_login" value="{ $escore.if_error.essysus_login }" /></td></tr>
		<tr><td>Hasło:<span style="color: #FF0000">*</span> </td><td><input class="a_inputtext" type="password" name="essysus_passwd_1" value="" /></td></tr>
		<tr><td>Powtórz hasło:<span style="color: #FF0000">*</span> </td><td><input class="a_inputtext" type="password" name="essysus_passwd_2" value="" /></td></tr>	
		<tr><td>Rola:<span style="color: #FF0000">*</span> </td><td><select class="a_select" name="esurole_id">
			<option value="">Wybierz rolę</option>	
			{ foreach from=$escore.role_list item=role }
				{ if $role->esurole_id == $escore.if_error.esurole_id }
					<option value="{$role->esurole_id}" selected="selected">{ $role->esurole_name }</option>
				{ else }
					<option value="{$role->esurole_id}">{ $role->esurole_name }</option>
				{ /if }
			{ /foreach }
			</select></td></tr>
		<tr><td>E-mail:<span style="color: #FF0000">*</span> </td><td><input class="a_inputtext" type="text" name="essysus_email" value="{$escore.if_error.essysus_email}" /></td></tr>
		<tr><td>Opis: </td><td><textarea class="a_inputtextarea" rows="4" cols="43" name="essysus_desc">{ $escore.if_error.essysus_desc }</textarea></td></tr>
		<tr><td>Aktywny:</td><td>
			{ if $escore.if_error.essysus_active != 'on'}
				 <input style="vertical-align: middle" type="checkbox" name="essysus_active" />
			{ else }
				 <input style="vertical-align: middle" type="checkbox" name="essysus_active" checked="checked" /> 
			{ /if }
		</td></tr>
                <tr><td></td><td><span style="color: #FF0000">*</span> - pozycje wymagane</td></tr>
                <tr style="text-align: center"><td colspan="2"><input id="submit" type="image" src="images/submit_button.jpg" /></td></tr>
	</table>
        </fieldset>
</form>
{ include file=$smarty.const.ADMIN_FOOTER }