<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/1999/REC-html401-19991224/loose.dtd">
<html>
<head>
  <title>Podgląd filmu</title>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
</head>
<body>
<?php
$esgal_id = $_GET['esgal_id'];
$esmov_filename = $_GET['esmov_filename'];
?>
 <!-- For Internet Explorer * Windows Media Player -->
     <object classid="CLSID:6BF52A52-394A-11D3-B153-00C04F79FAA6"
             type="application/x-oleobject" width="320" height="240"
             codebase="http://activex.microsoft.com/activex/controls/mplayer/en/nsmp2inf.cab#Version=6,4,5,715"
             standby="Loading Microsoft Windows Media Player components...">
        <param name="url" value="../movies/<?php echo $esgal_id; ?>/<?php echo $esmov_filename; ?>">
        <param name="autostart" value="false">
        <param name="ShowStatusBar" value="true">
        <param name="volume" value="100">

        <!-- For other browsers * Windows Media Player -->
        <!--[if !IE]> <-->
        <object width="320" height="240" type="application/x-mplayer2" >
          <param name="fileName" value="../movies/<?php echo $esgal_id; ?>/<?php echo $esmov_filename; ?>">
          <param name="autostart" value="0">
          <param name="ShowStatusBar" value="1">
          <param name="volume" value="0">
        </object>

        <!--> <![endif]-->
      </object>
</body>
</html>