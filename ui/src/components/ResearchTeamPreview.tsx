import { useState } from "react";
import { ArrowDown, FlaskConical, GitBranch, ShieldCheck, Workflow } from "lucide-react";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const roles = [
  { key: "lead", icon: Workflow },
  { key: "researcher", icon: FlaskConical },
  { key: "reviewer", icon: ShieldCheck },
] as const;

/** Review the proposed team without provisioning agents or creating runnable work. */
export function ResearchTeamPreview() {
  const { t } = useTranslation("workspace");
  const [open, setOpen] = useState(false);

  return <>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{t("teamPreview.title")}</span>
        <Badge variant="secondary">{t("teamPreview.draft")}</Badge>
      </div>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <GitBranch aria-hidden />{t("teamPreview.open")}
      </Button>
    </div>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-svh overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("teamPreview.title")}</DialogTitle>
          <DialogDescription>{t("teamPreview.description")}</DialogDescription>
        </DialogHeader>
        <section aria-label={t("teamPreview.orgLabel")} className="flex flex-col gap-4">
          <div className="flex items-center justify-center gap-2 text-sm font-medium">
            {t("teamPreview.owner")}<Badge variant="outline">{t("teamPreview.approval")}</Badge>
          </div>
          <ArrowDown className="mx-auto size-4 text-muted-foreground" aria-hidden />
          <div className="grid gap-4 sm:grid-cols-2">
            {roles.map(({ key, icon: Icon }, index) => <section key={key}
              className={index === 0 ? "border-b border-border pb-4 sm:col-span-2" : "flex flex-col gap-2"}>
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <Icon className="size-4 shrink-0" aria-hidden />{t(`teamPreview.${key}.name`)}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{t(`teamPreview.${key}.work`)}</p>
              <p className="mt-2 text-xs text-muted-foreground">{t(`teamPreview.${key}.output`)}</p>
            </section>)}
          </div>
        </section>
        <section className="flex flex-col gap-3 border-y border-border py-4" aria-labelledby="research-example-title">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id="research-example-title" className="text-sm font-medium">{t("teamPreview.example")}</h3>
            <Badge variant="outline">{t("teamPreview.notStarted")}</Badge>
          </div>
          <p className="text-sm">{t("teamPreview.task")}</p>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            {["prepare", "experiment", "evaluate", "report"].map(step => <li key={step}>{t(`teamPreview.steps.${step}`)}</li>)}
          </ol>
          <p className="text-xs text-muted-foreground">{t("teamPreview.scope")}</p>
        </section>
        <p className="text-sm text-muted-foreground">{t("teamPreview.boundary")}</p>
        <div className="flex justify-end"><Button onClick={() => setOpen(false)}>{t("teamPreview.close")}</Button></div>
      </DialogContent>
    </Dialog>
  </>;
}
