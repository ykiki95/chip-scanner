"""
ResNet50 기반 포장 칩 색상 판별 — Google Colab 학습 스크립트
================================================================

이 스크립트는 Colab 또는 로컬 GPU 머신에서 그대로 실행할 수 있도록 작성되었습니다.

데이터셋 폴더 구조 (ImageFolder 기준, 알파벳 순):
    dataset/
      train/
        consumable/
        not_recommended/
        very_fresh/
      val/
        consumable/
        not_recommended/
        very_fresh/

요구사항:
- transfer learning 기반 ResNet50
- 마지막 fc 레이어를 3 클래스로 변경
- CrossEntropyLoss + Adam
- early stopping
- best model 저장 (`model/best_model.pth`)
- confusion matrix, accuracy 출력

⚠️ 전처리는 `backend/app/model_loader.py` 의 `PREPROCESS` 와 동일하게 유지하세요.
   (Resize 256 → CenterCrop 224 → ToTensor → ImageNet Normalize)
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms

# ----------------------------------------------------------------------
# (선택) Colab 사용 시 Google Drive mount 예시
# ----------------------------------------------------------------------
# from google.colab import drive
# drive.mount('/content/drive')
# DATASET_DIR = '/content/drive/MyDrive/chip-dataset'
# OUTPUT_DIR  = '/content/drive/MyDrive/chip-models'

# ----------------------------------------------------------------------
# 하이퍼파라미터 / 경로
# ----------------------------------------------------------------------
NUM_CLASSES = 3
INPUT_SIZE = 224
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


def build_transforms() -> tuple[transforms.Compose, transforms.Compose]:
    """학습/검증 transform 빌드.

    검증/추론 전처리는 FastAPI 서버와 정확히 일치해야 한다.
    """
    train_tf = transforms.Compose(
        [
            transforms.Resize(256),
            transforms.RandomResizedCrop(INPUT_SIZE, scale=(0.8, 1.0)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.15),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )
    val_tf = transforms.Compose(
        [
            transforms.Resize(256),
            transforms.CenterCrop(INPUT_SIZE),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )
    return train_tf, val_tf


def build_model(num_classes: int = NUM_CLASSES) -> nn.Module:
    """ImageNet pretrained ResNet50 로드 후 마지막 fc 교체."""
    weights = models.ResNet50_Weights.IMAGENET1K_V2
    model = models.resnet50(weights=weights)
    in_features = model.fc.in_features
    model.fc = nn.Linear(in_features, num_classes)
    return model


def confusion_matrix(y_true: list[int], y_pred: list[int], num_classes: int) -> np.ndarray:
    cm = np.zeros((num_classes, num_classes), dtype=int)
    for t, p in zip(y_true, y_pred):
        cm[t, p] += 1
    return cm


def evaluate(model: nn.Module, loader: DataLoader, device: torch.device) -> tuple[float, list[int], list[int]]:
    model.eval()
    correct = 0
    total = 0
    y_true: list[int] = []
    y_pred: list[int] = []
    with torch.inference_mode():
        for x, y in loader:
            x, y = x.to(device), y.to(device)
            logits = model(x)
            pred = logits.argmax(dim=1)
            correct += (pred == y).sum().item()
            total += y.size(0)
            y_true.extend(y.cpu().tolist())
            y_pred.extend(pred.cpu().tolist())
    acc = correct / max(1, total)
    return acc, y_true, y_pred


def train(
    dataset_dir: str,
    output_dir: str,
    epochs: int = 25,
    batch_size: int = 32,
    lr: float = 1e-4,
    patience: int = 5,
    num_workers: int = 2,
) -> Path:
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[info] Using device: {device}")

    train_tf, val_tf = build_transforms()
    train_set = datasets.ImageFolder(os.path.join(dataset_dir, "train"), transform=train_tf)
    val_set = datasets.ImageFolder(os.path.join(dataset_dir, "val"), transform=val_tf)

    print(f"[info] Train classes (idx): {train_set.class_to_idx}")
    assert (
        train_set.classes == val_set.classes
    ), "train/val class 목록이 일치해야 합니다."
    assert len(train_set.classes) == NUM_CLASSES, f"클래스가 {NUM_CLASSES}개여야 합니다."

    train_loader = DataLoader(
        train_set, batch_size=batch_size, shuffle=True, num_workers=num_workers, pin_memory=True
    )
    val_loader = DataLoader(
        val_set, batch_size=batch_size, shuffle=False, num_workers=num_workers, pin_memory=True
    )

    model = build_model(NUM_CLASSES).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=lr)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="max", factor=0.5, patience=2)

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    best_path = output_path / "best_model.pth"

    best_acc = 0.0
    bad_epochs = 0
    for epoch in range(1, epochs + 1):
        model.train()
        running_loss = 0.0
        for x, y in train_loader:
            x, y = x.to(device), y.to(device)
            optimizer.zero_grad()
            logits = model(x)
            loss = criterion(logits, y)
            loss.backward()
            optimizer.step()
            running_loss += loss.item() * x.size(0)
        train_loss = running_loss / len(train_set)

        val_acc, y_true, y_pred = evaluate(model, val_loader, device)
        scheduler.step(val_acc)

        print(
            f"[epoch {epoch:02d}] train_loss={train_loss:.4f}  val_acc={val_acc:.4f}"
        )

        if val_acc > best_acc:
            best_acc = val_acc
            torch.save(model.state_dict(), best_path)
            print(f"  ↳ saved best model to {best_path} (val_acc={val_acc:.4f})")
            bad_epochs = 0
        else:
            bad_epochs += 1
            if bad_epochs >= patience:
                print(f"[info] Early stopping (no improvement for {patience} epochs)")
                break

    # 최종 평가 + confusion matrix
    print("\n[info] Best val accuracy:", best_acc)
    model.load_state_dict(torch.load(best_path, map_location=device))
    final_acc, y_true, y_pred = evaluate(model, val_loader, device)
    cm = confusion_matrix(y_true, y_pred, NUM_CLASSES)
    print(f"\n[result] Final val accuracy: {final_acc:.4f}")
    print("[result] Confusion matrix (rows=true, cols=pred):")
    print(f"          {train_set.classes}")
    for i, row in enumerate(cm):
        print(f"  {train_set.classes[i]:>16s}: {row.tolist()}")

    return best_path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=str, default="dataset", help="데이터셋 루트")
    parser.add_argument("--output", type=str, default="model", help="모델 저장 디렉터리")
    parser.add_argument("--epochs", type=int, default=25)
    parser.add_argument("--batch_size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--patience", type=int, default=5)
    args = parser.parse_args()

    train(
        dataset_dir=args.dataset,
        output_dir=args.output,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        patience=args.patience,
    )


if __name__ == "__main__":
    main()
