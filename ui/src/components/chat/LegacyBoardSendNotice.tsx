import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function LegacyBoardSendNotice({ onDiscard }: { onDiscard: () => void }) {
  useInterfaceLanguage();
  return <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button size="sm" variant="outline">{interfaceText("m_d4e26c37b15521")}</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{interfaceText("m_d41005ee300eb9")}</AlertDialogTitle>
        <AlertDialogDescription>{interfaceText("m_a333dfb1189998")}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{interfaceText("m_562a1cd235fc02")}</AlertDialogCancel>
        <AlertDialogAction onClick={onDiscard}>{interfaceText("m_de3035c741cbdb")}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
