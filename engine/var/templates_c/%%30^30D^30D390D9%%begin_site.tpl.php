<?php /* Smarty version 2.6.17, created on 2018-09-17 15:11:41
         compiled from layout/includes/begin_site.tpl */ ?>
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
		<link rel="Stylesheet" type="text/css" href="css/style_all<?php echo $this->_tpl_vars['config_array']['admin_style']; ?>
.css" />

                <link rel="Stylesheet" type="text/css" href="css/white.css" />
		<!--[if IE]>
		<link rel="Stylesheet" type="text/css" href="css/style_ie<?php echo $this->_tpl_vars['config_array']['admin_style']; ?>
.css" />
		<![endif]-->    
    <script type="text/javascript" src="js/jquery-1.3.2.min.js"></script>
    <script type="text/javascript" src="js/jquery.galleriffic.js"></script>
        <script type="text/javascript">
        //<![CDATA[
        <?php echo '
        document.write("<style type=\'text/css\'>div.navigation{width:300px;float: left;}div.content{display:block;}</style>");
        '; ?>

        //]]>
        </script>
    <script type="text/javascript" src="js/external.js"></script>
		<script type="text/javascript" src="js/fancybox/jquery.fancybox-1.2.1.pack.js"></script>
   	<script type="text/javascript" src="js/fancybox/jquery.easing.js"></script>   		
   	<script type="text/javascript" src="js/jquery.jclock.js"></script>
		<script type="text/javascript" src="js/function.js"></script>		
	  <script type="text/javascript">
	     var token = "<?php echo $this->_tpl_vars['Interface']->generateToken(); ?>
"; 
	     var mainurl = '<?php echo @MAINURL; ?>
/';	    
	  </script>	 
	</head>
  <body<?php echo $this->_tpl_vars['config_array']['admin_log_style']; ?>
>
    <?php echo '<?php'; ?>
 include_once("analyticstracking.php") <?php echo '?>'; ?>

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
      <div id="outer">
      <div id="site">
      