{ assign var="metatags" value=$Interface->callModule('system','getSite_DescTitle')}
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//PL" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="pl" lang="pl">
	<head>
        <meta http-equiv="Content-Language" content="pl" />
        <title>{$metatags.0->essys_content}
        </title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <base href="{$smarty.const.MAINURL}/" />
        <meta name="keywords" content="" />
        <meta name="description" content="{$metatags.1->essys_content}"/>
        <meta name="author" content="ESCO" />
        <meta name="robots" content="index, follow" />
        <meta name="Revisit-after" content="7 days" />
        <meta name="Generator" content="Escore" />
        <link rel="Stylesheet" type="text/css" href="js/fancybox/jquery.fancybox.css" />
        <link rel="Stylesheet" type="text/css" href="css/style_panel_access.css" />
        <!--[if IE]>
		<link rel="Stylesheet" type="text/css" href="css/style_ie{$config_array.admin_style}.css" />
		<![endif]-->
        <script type="text/javascript" src="js/jquery-1.3.2.min.js"></script>
        <script type="text/javascript" src="js/external.js"></script>
        <script type="text/javascript" src="js/function.js"></script>
        <script type="text/javascript">
           var token = "{$Interface->generateToken()}";
           var mainurl = '{$smarty.const.MAINURL}/';
        </script>
    </head>
    <body>
        <noscript>
            <h1 id="noscript">UWAGA! Twoja przeglądarka ma wyłączoną obsługę JavaScript!<br />Aby w pełni korzystać ze strony WŁĄCZ obsługę JavaScript!</h1>
        </noscript>
        <script type="text/javascript">
            {literal}
            $(document).ready(function() {$("a.gal1").fancybox({ 'zoomSpeedIn': 300, 'zoomSpeedOut': 300, 'overlayShow': false });});
            $(document).click(function() {
                    $("span.next").click(function() {
                            $("#t1").hide('slow'); $("#t2").show('slow');
                    });
            });
            $(document).click(function() {
                    $("span.back").click(function() {
                            $("#t1").slideDown('slow'); $("#t2").slideUp('slow');
                    });
            });
            {/literal}
        </script>
        <div id="outer" style="margin-top: -200px;">
            <div id="inputs">
                <form action="?module=users&amp;action=login" method="post">
                    <div id="error_message">{ $message }</div>
                    <div id="login_input"><input style="background-color: #f5f5f5;" class="input" type="text" name="login" title="Nazwa użytkownika" value="{if $escore.login}{$escore.login}{else}Nazwa użytkownika{/if}" /></div>
                    <div id="password_input"><input style="display: none; background-color: #f5f5f5;" id="real" class="input" type="password" name="password" title="Hasło" /><input style="background-color: #f5f5f5;" id="fake" class="input" type="text" name="fake" title="Hasło" value="Hasło" /></div>
                    <div id="login_button"><input type="image" src="images/login_button.jpg" alt="" /></div>
                    <input type="hidden" name="type" value="{if $escore.type}{$escore.type}{else}normal{/if}" />
                    <input type="hidden" name="matchid" value="{if $escore.matchid}{$escore.matchid}{/if}" />
                </form>
            </div>
         </div>

{ include file="layout/includes/end_site.tpl" }