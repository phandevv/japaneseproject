# ADR 0003: Deploy via AWS SSM Agent (.ai/decisions/0003-ssm-agent-deployment.md)

## Status
Accepted

## Context
Quy trình CI/CD cần gửi tín hiệu deploy và kích hoạt kéo Container mới từ ECR về trên AWS EC2. Phương pháp truyền thống là mở cổng SSH (port 22) trên EC2 và để GitLab Runner kết nối thông qua SSH Key. Tuy nhiên, việc mở cổng SSH ra ngoài Internet công cộng mang lại nguy cơ bảo mật lớn (bị tấn công dò mật khẩu, quét cổng brute-force).

## Decision
Chúng tôi quyết định sử dụng dịch vụ **AWS Systems Manager (SSM) Agent** để triển khai code từ xa:
1. Đóng cổng SSH (port 22) trên EC2 Instance trong Security Group.
2. Gán IAM Instance Profile cho EC2 với quyền `AmazonSSMManagedInstanceCore` để kích hoạt SSM Agent.
3. Trong tệp `.gitlab-ci.yml`, GitLab Runner sử dụng AWS CLI để thực thi lệnh `aws ssm send-command` gửi kịch bản triển khai shell script từ xa trực tiếp lên EC2:
   ```bash
   aws ssm send-command \
     --document-name "AWS-RunShellScript" \
     --instance-ids "$INSTANCE_ID" \
     --parameters "commands=[\"$COMMAND\"]"
   ```
4. SSM Agent trên EC2 sẽ định kỳ kiểm tra hàng đợi lệnh từ AWS, lấy lệnh về chạy dưới quyền root trên EC2 và gửi kết quả log trở lại cho GitLab CI/CD.

## Consequences
* **Ưu điểm**:
   * Bảo mật tuyệt đối: Cổng 22 trên EC2 có thể đóng hoàn toàn. Không cần chia sẻ hay cấu hình Private SSH Key của EC2 trên GitLab Variables.
   * Quản lý quyền hạn chặt chẽ qua AWS IAM Role.
* **Nhược điểm**:
   * Quá trình deploy phụ thuộc vào tốc độ phản hồi của SSM Agent (thường mất từ 5-15 giây để Agent nhận và chạy lệnh). Tuy nhiên, đây là sự đánh đổi hoàn toàn xứng đáng vì tính an toàn bảo mật.
