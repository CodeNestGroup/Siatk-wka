<?php /* Smarty version 2.6.17, created on 2011-04-26 12:18:49
         compiled from system/system_preferences.tpl */ ?>
<?php echo $this->_tpl_vars['Interface']->callModule('menu','showAdminMenu'); ?>

<fieldset>
    <legend>Ustawienia</legend>
	<table cellpadding="5" cellspacing="0" border="0" class="a_main">
            <form action="?module=system&amp;action=savepref" name="edit_pref" method="post">
        <tr>
            <td>
                Tytuł strony</td><td><input class="a_inputtext" type="text" style="width: 500px;" name="field1" value="<?php echo $this->_tpl_vars['escore']['field1']; ?>
<?php echo $this->_tpl_vars['escore']['if_error']['field1']; ?>
" />
                                <div class="help" onmouseover="$(this).next().show();" onmouseout="$(this).next().hide();" >?</div>
                    <div class="help_info">Wpisz tytuł strony, który wyświetli się w nagłówku karty twojej przeglądarki.</div>
            </td>
        </tr>
        <tr><td>Opis strony</td><td>
                <input class="a_inputtext" type="text" style="width: 500px;" name="field2" value="<?php echo $this->_tpl_vars['escore']['field2']; ?>
<?php echo $this->_tpl_vars['escore']['if_error']['field2']; ?>
" />
                                    <div class="help" onmouseover="$(this).next().show();" onmouseout="$(this).next().hide();" >?</div>
                    <div class="help_info">Opisz w kilku zdaniach swoją stronę.</div>
        </td></tr>
        <tr><td>
                Blokada zapisu przed meczem (w godzinach)</td><td><input class="a_inputtext" type="text" maxlength="3" style="width: 50px;" name="field3" value="<?php echo $this->_tpl_vars['escore']['field3']; ?>
<?php echo $this->_tpl_vars['escore']['if_error']['field3']; ?>
" /><span class="settings_error_message"><?php echo $this->_tpl_vars['escore']['messages']['3']; ?>
</span>
                     <div class="help" onmouseover="$(this).next().show();" onmouseout="$(this).next().hide();" >?</div>
                     <div class="help_info">Określ na ile godzin przed rozpoczęciem spotkania ma być zablokowana możliwość zapisania się.</div>
        </td></tr>
        <tr><td>
                Blokada wypisu przed meczem (w godzinach)</td><td><input class="a_inputtext" type="text" maxlength="3" style="width: 50px;" name="field4" value="<?php echo $this->_tpl_vars['escore']['field4']; ?>
<?php echo $this->_tpl_vars['escore']['if_error']['field4']; ?>
" /><span class="settings_error_message"><?php echo $this->_tpl_vars['escore']['messages']['4']; ?>
</span>
                     <div class="help" onmouseover="$(this).next().show();" onmouseout="$(this).next().hide();" >?</div>
                     <div class="help_info">Określ na ile godzin przed rozpoczęciem spotkania ma być zablokowana możliwość wypisania się.</div>
        </td></tr>
        <tr><td>Adres mailowy nadawcy</td><td><input class="a_inputtext" type="text" style="width: 200px;" name="field5" value="<?php echo $this->_tpl_vars['escore']['field5']; ?>
<?php echo $this->_tpl_vars['escore']['if_error']['field5']; ?>
" /><span class="settings_error_message"><?php echo $this->_tpl_vars['escore']['messages']['5']; ?>
</span>
                     <div class="help" onmouseover="$(this).next().show();" onmouseout="$(this).next().hide();" >?</div>
                     <div class="help_info">Podaj adres mailowy z którego będą wysyłane wiadomości do zawodników.</div>
            </td></tr>
        <tr style="text-align: center">
            <td colspan="2"><input id="submit_match" type="image" src="images/submit_button.jpg" /></td>
        </tr>
	</form>
        </table>
</fieldset>

<?php $_smarty_tpl_vars = $this->_tpl_vars;
$this->_smarty_include(array('smarty_include_tpl_file' => @ADMIN_FOOTER, 'smarty_include_vars' => array()));
$this->_tpl_vars = $_smarty_tpl_vars;
unset($_smarty_tpl_vars);
 ?>