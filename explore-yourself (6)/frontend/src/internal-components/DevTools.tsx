import { useEffect } from "react";
import type { PropsWithChildren, ReactNode } from "react";

const PassthroughBoundary = ({ children }: PropsWithChildren) => <>{children}</>;

const MessageEmitter = PassthroughBoundary;
const InternalErrorBoundary = PassthroughBoundary;
const UserErrorBoundary = PassthroughBoundary;

interface Props {
  children: ReactNode;
  shouldRender: boolean;
}

function logReason(event: PromiseRejectionEvent) {
  console.error(event?.reason);
}

/**
 * Render extra dev tools around the app when in dev mode,
 * but only render the app itself in prod mode
 */
export const DevTools = ({ children, shouldRender }: Props) => {
  useEffect(() => {
    if (shouldRender) {
      window.addEventListener("unhandledrejection", logReason);

      return () => {
        window.removeEventListener("unhandledrejection", logReason);
      };
    }
  }, [shouldRender]);

  if (shouldRender) {
    return (
      <InternalErrorBoundary>
        <UserErrorBoundary>
          <MessageEmitter>{children}</MessageEmitter>
        </UserErrorBoundary>
      </InternalErrorBoundary>
    );
  }

  return <>{children}</>;
};
