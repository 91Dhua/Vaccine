import { ConfigProvider, message } from "antd";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
  type RefObject
} from "react";

const MobileSimulationScreenRefContext = createContext<RefObject<HTMLDivElement | null> | null>(
  null
);

/** 供 Modal / 静态 Modal API 的 getContainer，未包裹模拟机时回退到 document.body */
export function useMobileSimulationContainer(): () => HTMLElement {
  const ref = useContext(MobileSimulationScreenRefContext);
  return useCallback(() => ref?.current ?? document.body, [ref]);
}

/** Console 内「Mobile 接种」：手机外框 + 状态栏 + 安全区，弹层限制在屏幕内 */
export function MobileSimulationShell({ children }: { children: ReactNode }) {
  const screenRef = useRef<HTMLDivElement>(null);
  const getPopupContainer = useCallback(() => screenRef.current ?? document.body, []);

  useEffect(() => {
    message.config({
      getContainer: () => screenRef.current ?? document.body,
      top: 52
    });
    return () => {
      message.config({
        getContainer: () => document.body,
        top: 8
      });
    };
  }, []);

  return (
    <MobileSimulationScreenRefContext.Provider value={screenRef}>
      <div className="mobile-vacc-host">
        <div className="mobile-vacc-phone" aria-label="Mobile 接种演示（模拟手机）">
          <div className="mobile-vacc-phone__status" aria-hidden>
            <span className="mobile-vacc-phone__status-left" />
            <time className="mobile-vacc-phone__time">9:41</time>
            <span className="mobile-vacc-phone__status-right" />
          </div>
          <div className="mobile-vacc-phone__screen" ref={screenRef}>
            <ConfigProvider getPopupContainer={getPopupContainer}>
              <div className="mobile-vacc-phone__viewport">{children}</div>
            </ConfigProvider>
          </div>
          <div className="mobile-vacc-phone__home-indicator" aria-hidden />
        </div>
      </div>
    </MobileSimulationScreenRefContext.Provider>
  );
}
