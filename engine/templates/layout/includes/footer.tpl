</div>
</div>
<div id="foot">
  <div id="mainfoot">
    {assign var="foot" value=$Interface->callModule('system','getFoot')}
      <div id="text">{$foot.0->essys_content}</div>
  </div>
</div>
