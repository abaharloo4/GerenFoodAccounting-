!macro customInit
  ; Delete old Persian shortcuts before installation starts
  Delete "$DESKTOP\سیستم حسابداری گرن.lnk"
  Delete "$SMPROGRAMS\سیستم حسابداری گرن.lnk"
  Delete "$SMPROGRAMS\سیستم حسابداری گرن\*.lnk"
  RMDir "$SMPROGRAMS\سیستم حسابداری گرن"
  Delete "$DESKTOP\GerenFoodAccounting.lnk"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
!macroend

!macro customInstall
  ; Delete old Persian shortcuts
  Delete "$DESKTOP\سیستم حسابداری گرن.lnk"
  Delete "$SMPROGRAMS\سیستم حسابداری گرن.lnk"
  Delete "$SMPROGRAMS\سیستم حسابداری گرن\*.lnk"
  RMDir "$SMPROGRAMS\سیستم حسابداری گرن"

  ; Delete old shortcut so NSIS recreates fresh with new icon
  Delete "$DESKTOP\GerenFoodAccounting.lnk"

  ; Force Windows Explorer to refresh icon cache immediately
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
!macroend

!macro customUnInstall
  Delete "$DESKTOP\سیستم حسابداری گرن.lnk"
  Delete "$DESKTOP\GerenFoodAccounting.lnk"
  Delete "$SMPROGRAMS\سیستم حسابداری گرن.lnk"
  Delete "$SMPROGRAMS\GerenFoodAccounting.lnk"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
!macroend
