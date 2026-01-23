"use client";
import { useEffect } from 'react';
import { useRoleTheme } from '@/contexts/RoleThemeContext';

/**
 * このフックはuserRoleに応じてbodyにクラスやCSS変数を付与します。
 * 必ず_appやlayoutの最上位で呼び出してください。
 */
export function useApplyRoleTheme() {
  const { userRole } = useRoleTheme();

  useEffect(() => {
    const body = document.body;
    body.classList.remove('role-parent', 'role-child');
    if (userRole === 'parent') {
      body.classList.add('role-parent');
    } else if (userRole === 'child') {
      body.classList.add('role-child');
    }
  }, [userRole]);
}
