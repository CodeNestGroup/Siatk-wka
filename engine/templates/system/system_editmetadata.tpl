{ $Interface->callModule('menu','showAdminMenu') }
<form action="?module=system&amp;action=savemetadata" name="edit_metadata" method="post">
	<table cellpadding="0" cellspacing="0" border="0" class="a_main">
	<tr class="a_title"><td colspan="3"><img src="images/admin/system_icon_bar.jpg" alt="" />Ustawienia > <small>Edycja metatagów</small></td></tr>
	{foreach from=$lang_array item=itlg name=itlg }
	<tr class="a_add">
    {assign var="langtitle" value=$itlg|cat:"_metadata_title"}
    <td class="a_add_title">Tytuł <img src="images/admin/flags/{$itlg}.gif" alt="" /> : </td>
    <td><input class="a_inputtext" type="text" name="system_title_{$itlg}" value="{ $escore.$langtitle }" /></td>
  </tr>
	<tr class="a_add">
    {assign var="langkeywords" value=$itlg|cat:"_metadata_keywords"}
    <td class="a_add_title">Słowa kluczowe <img src="images/admin/flags/{$itlg}.gif" alt="" /> : </td>
    <td><textarea class="a_inputtextarea" name="system_keywords_{$itlg}">{ $escore.$langkeywords }</textarea></td>
  </tr>
	<tr class="a_add">
    {assign var="langdesc" value=$itlg|cat:"_metadata_desc"}
    <td class="a_add_title">Opis <img src="images/admin/flags/{$itlg}.gif" alt="" /> : </td>    
    <td><textarea class="a_inputtextarea" name="system_desc_{$itlg}" />{ $escore.$langdesc }</textarea></td>
  </tr>
  <tr><td colspan="2" style="height: 1px; font-size: 1px; background-color: #9f9f9f"></td></tr>
	{ /foreach} 
	<tr class="a_add_active"><td></td><td style="padding-left: 240px;">	
	<input class="a_submit" type="submit" value="Zapisz">
	</td></tr>	
</table>
</form>
{ include file=$smarty.const.ADMIN_FOOTER }