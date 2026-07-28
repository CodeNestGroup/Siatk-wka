<?php /* Smarty version 2.6.17, created on 2018-09-17 16:36:12
         compiled from layout/loginform.tpl */ ?>
<?php $this->assign('metatags', $this->_tpl_vars['Interface']->callModule('system','getSite_DescTitle')); ?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//PL" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="pl" lang="pl">
	<head>
        <meta http-equiv="Content-Language" content="pl" />
        <title><?php echo $this->_tpl_vars['metatags']['0']->essys_content; ?>

        </title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <base href="<?php echo @MAINURL; ?>
/" />
        <meta name="keywords" content="" />
        <meta name="description" content="<?php echo $this->_tpl_vars['metatags']['1']->essys_content; ?>
"/>
        <meta name="author" content="ESCO" />
        <meta name="robots" content="index, follow" />
        <meta name="Revisit-after" content="7 days" />
        <meta name="Generator" content="Escore" />
        <link rel="Stylesheet" type="text/css" href="js/fancybox/jquery.fancybox.css" />
        <link rel="Stylesheet" type="text/css" href="css/style_panel_access.css" />
        <!--[if IE]>
		<link rel="Stylesheet" type="text/css" href="css/style_ie<?php echo $this->_tpl_vars['config_array']['admin_style']; ?>
.css" />
		<![endif]-->
        <script type="text/javascript" src="js/jquery-1.3.2.min.js"></script>
        <script type="text/javascript" src="js/external.js"></script>
        <script type="text/javascript" src="js/function.js"></script>
        <script type="text/javascript">
           var token = "<?php echo $this->_tpl_vars['Interface']->generateToken(); ?>
";
           var mainurl = '<?php echo @MAINURL; ?>
/';
        </script>
    </head>
    <body>
        <noscript>
            <h1 id="noscript">UWAGA! Twoja przeglądarka ma wyłączoną obsługę JavaScript!<br />Aby w pełni korzystać ze strony WŁĄCZ obsługę JavaScript!</h1>
        </noscript>
        <script type="text/javascript">
            <?php echo '
            $(document).ready(function() {$("a.gal1").fancybox({ \'zoomSpeedIn\': 300, \'zoomSpeedOut\': 300, \'overlayShow\': false });});
            $(document).click(function() {
                    $("span.next").click(function() {
                            $("#t1").hide(\'slow\'); $("#t2").show(\'slow\');
                    });
            });
            $(document).click(function() {
                    $("span.back").click(function() {
                            $("#t1").slideDown(\'slow\'); $("#t2").slideUp(\'slow\');
                    });
            });
            '; ?>

        </script>
        <div id="outer" style="margin-top: -200px;">
            <div id="inputs">
                <form action="?module=users&amp;action=login" method="post">
                    <div id="error_message"><?php echo $this->_tpl_vars['message']; ?>
</div>
                    <div id="login_input"><input style="background-color: #f5f5f5;" class="input" type="text" name="login" title="Nazwa użytkownika" value="<?php if ($this->_tpl_vars['escore']['login']): ?><?php echo $this->_tpl_vars['escore']['login']; ?>
<?php else: ?>Nazwa użytkownika<?php endif; ?>" /></div>
                    <div id="password_input"><input style="display: none; background-color: #f5f5f5;" id="real" class="input" type="password" name="password" title="Hasło" /><input style="background-color: #f5f5f5;" id="fake" class="input" type="text" name="fake" title="Hasło" value="Hasło" /></div>
                    <div id="login_button"><input type="image" src="images/login_button.jpg" alt="" /></div>
                    <input type="hidden" name="type" value="<?php if ($this->_tpl_vars['escore']['type']): ?><?php echo $this->_tpl_vars['escore']['type']; ?>
<?php else: ?>normal<?php endif; ?>" />
                    <input type="hidden" name="matchid" value="<?php if ($this->_tpl_vars['escore']['matchid']): ?><?php echo $this->_tpl_vars['escore']['matchid']; ?>
<?php endif; ?>" />
                </form>
            </div>
         </div>

<?php $_smarty_tpl_vars = $this->_tpl_vars;
$this->_smarty_include(array('smarty_include_tpl_file' => "layout/includes/end_site.tpl", 'smarty_include_vars' => array()));
$this->_tpl_vars = $_smarty_tpl_vars;
unset($_smarty_tpl_vars);
 ?>