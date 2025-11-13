import { redirect } from 'next/navigation'

/**
 * Redirect /usuarios to /configuracoes
 *
 * A listagem de usuários agora está em Configurações > Usuários
 * Mantemos as rotas /usuarios/novo e /usuarios/[id]/editar para os formulários
 */
export default function UsuariosRedirectPage() {
  redirect('/configuracoes')
}
